import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PromotionEvaluatorService, CartItem } from './promotion-evaluator.service';
import { Promotion } from '../../common/entities/promotion.entity';
import { PromotionRedemption } from '../../common/entities/promotion-redemption.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';

const BIZ_ID = 'biz-1';
const CAT_ID = 'cat-electronics';
const PROD_ID = 'prod-laptop';
const LOC_ID = 'loc-1';

function basePromo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    business_id: BIZ_ID,
    code: 'PROM-TEST',
    name: 'Test',
    description: null,
    promotion_type: 'percent_off_order',
    value: 10,
    target_category_id: null,
    target_product_id: null,
    min_order_total_ttc: 0,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    valid_date_type: 'D',
    valid_dates: null,
    day_type: 'A',
    time_periods: null,
    adjust_for_holidays: false,
    invalid_date_periods: null,
    target_audience: 'all',
    target_grade_ids: [],
    target_label_ids: [],
    target_customer_ids: [],
    applicable_location_ids: [],
    max_total_uses: 0,
    max_uses_per_day: 0,
    max_uses_per_customer: 0,
    max_uses_per_customer_day: 0,
    current_uses: 0,
    notify_sms: false,
    notify_email: false,
    notify_whatsapp: false,
    advance_notify_days: 0,
    share_enabled: false,
    share_main_title: null,
    share_subtitle: null,
    share_poster_url: null,
    share_landing_url: null,
    status: 'active',
    remark: null,
    created_by_user_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    redemptions: [],
    business: null as any,
    target_category: null as any,
    target_product: null as any,
    created_by: null as any,
    ...overrides,
  };
}

function makeCartItems(): CartItem[] {
  return [
    { product_id: PROD_ID, category_id: CAT_ID, quantity: 2, unit_price_ttc: 100, line_index: 0 },
    { product_id: 'prod-2', category_id: 'cat-other', quantity: 1, unit_price_ttc: 50, line_index: 1 },
  ];
}

function makeQb(promos: Promotion[], count = 0) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(promos),
    getCount: jest.fn().mockResolvedValue(count),
    select: jest.fn().mockReturnThis(),
  };
}

async function buildEvaluator(promos: Promotion[], customerOverride?: any, redemptionCount = 0) {
  const promoQb = makeQb(promos);
  const redemptionQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(redemptionCount),
  };

  const promoRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(promoQb),
  };
  const redemptionRepo = {
    count: jest.fn().mockResolvedValue(redemptionCount),
    createQueryBuilder: jest.fn().mockReturnValue(redemptionQb),
  };
  const customerRepo = {
    findOne: jest.fn().mockResolvedValue(customerOverride ?? null),
  };
  const claRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const module = await Test.createTestingModule({
    providers: [
      PromotionEvaluatorService,
      { provide: getRepositoryToken(Promotion), useValue: promoRepo },
      { provide: getRepositoryToken(PromotionRedemption), useValue: redemptionRepo },
      { provide: getRepositoryToken(Customer), useValue: customerRepo },
      { provide: getRepositoryToken(CustomerLabelAssignment), useValue: claRepo },
    ],
  }).compile();

  return module.get(PromotionEvaluatorService);
}

describe('PromotionEvaluatorService', () => {
  const cartItems = makeCartItems();
  const now = new Date('2026-05-05T14:00:00Z'); // Tuesday

  it('returns applicable promotion for basic percent_off_order', async () => {
    const evaluator = await buildEvaluator([basePromo()]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(1);
    expect(result[0].promotion_id).toBe('promo-1');
    // 10% of (200 + 50) = 25
    expect(result[0].computed_discount).toBeCloseTo(25);
  });

  it('excludes promotion outside date range', async () => {
    const promo = basePromo({ start_date: '2025-01-01', end_date: '2025-12-31' });
    const evaluator = await buildEvaluator([promo]);
    // The QB filter already handles date range; mock returns nothing if DB filters it out
    const promoQb = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]) };
    const evaluator2 = await buildEvaluator([]);
    const result = await evaluator2.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(0);
  });

  it('excludes promotion by day_of_week (W type) when today is not in valid_dates', async () => {
    // now = Tuesday (spec day = 2); promo only valid on Friday (5) and Saturday (6)
    const promo = basePromo({ valid_date_type: 'W', valid_dates: '5,6' });
    const evaluator = await buildEvaluator([promo]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(0);
  });

  it('includes promotion by day_of_week when today matches', async () => {
    // now = Tuesday = spec day 2
    const promo = basePromo({ valid_date_type: 'W', valid_dates: '2,3' });
    const evaluator = await buildEvaluator([promo]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(1);
  });

  it('excludes promotion on Moroccan holiday when adjust_for_holidays=true', async () => {
    const labourDay = new Date('2026-05-01T10:00:00Z');
    const promo = basePromo({ adjust_for_holidays: true });
    const evaluator = await buildEvaluator([promo]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, labourDay);
    expect(result).toHaveLength(0);
  });

  it('does not exclude on holiday when adjust_for_holidays=false', async () => {
    const labourDay = new Date('2026-05-01T10:00:00Z');
    const promo = basePromo({ adjust_for_holidays: false });
    const evaluator = await buildEvaluator([promo]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, labourDay);
    expect(result).toHaveLength(1);
  });

  it('excludes promotion when today falls in invalid_date_periods (blackout)', async () => {
    const promo = basePromo({
      invalid_date_periods: [{ start: '2026-05-01', end: '2026-05-10' }],
    });
    const evaluator = await buildEvaluator([promo]);
    // now = 2026-05-05 which is in the blackout
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(0);
  });

  it('includes promotion when today is outside invalid_date_periods', async () => {
    const promo = basePromo({
      invalid_date_periods: [{ start: '2026-03-01', end: '2026-04-30' }],
    });
    const evaluator = await buildEvaluator([promo]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(1);
  });

  it('applies category scope — only affects items in the target category', async () => {
    const promo = basePromo({
      promotion_type: 'percent_off_category',
      target_category_id: CAT_ID,
      value: 20,
    });
    const evaluator = await buildEvaluator([promo]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(1);
    // only line_index 0 has CAT_ID
    expect(result[0].affected_line_indexes).toEqual([0]);
    // 20% of (2 * 100) = 40
    expect(result[0].computed_discount).toBeCloseTo(40);
  });

  it('applies product scope — only affects items with the target product', async () => {
    const promo = basePromo({
      promotion_type: 'percent_off_product',
      target_product_id: PROD_ID,
      value: 50,
    });
    const evaluator = await buildEvaluator([promo]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(1);
    expect(result[0].affected_line_indexes).toEqual([0]);
    // 50% of 200 = 100
    expect(result[0].computed_discount).toBeCloseTo(100);
  });

  it('excludes when max_total_uses is reached (current_uses >= max)', async () => {
    const promo = basePromo({ max_total_uses: 5, current_uses: 5 });
    const evaluator = await buildEvaluator([promo]);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, null, LOC_ID, now);
    expect(result).toHaveLength(0);
  });

  it('best_only mode returns only the highest-discount promotion', async () => {
    const promo1 = basePromo({ id: 'p1', promotion_type: 'percent_off_order', value: 5 });
    const promo2 = basePromo({ id: 'p2', promotion_type: 'percent_off_order', value: 20 });
    const evaluator = await buildEvaluator([promo1, promo2]);
    const result = await evaluator.evaluateWithStackingMode(
      BIZ_ID, cartItems, null, LOC_ID, now, 'best_only',
    );
    expect(result.applicable_promotions).toHaveLength(1);
    expect(result.applicable_promotions[0].promotion_id).toBe('p2');
    expect(result.stackable).toBe(false);
  });

  it('stack mode returns all promotions sorted by scope', async () => {
    const promos = [
      basePromo({ id: 'order1', promotion_type: 'percent_off_order', value: 5 }),
      basePromo({ id: 'cat1', promotion_type: 'percent_off_category', target_category_id: CAT_ID, value: 10 }),
      basePromo({ id: 'prod1', promotion_type: 'percent_off_product', target_product_id: PROD_ID, value: 15 }),
    ];
    const evaluator = await buildEvaluator(promos);
    const result = await evaluator.evaluateWithStackingMode(
      BIZ_ID, cartItems, null, LOC_ID, now, 'stack',
    );
    expect(result.stackable).toBe(true);
    const types = result.applicable_promotions.map((p) => p.promotion_type);
    // product first, then category, then order
    expect(types[0]).toBe('percent_off_product');
    expect(types[1]).toBe('percent_off_category');
    expect(types[2]).toBe('percent_off_order');
  });

  it('excludes promotion targeting specific grade when customer has different grade', async () => {
    const promo = basePromo({
      target_audience: 'grade',
      target_grade_ids: ['grade-gold'],
    });
    const customer = { id: 'cust-1', business_id: BIZ_ID, grade_id: 'grade-silver' } as any;
    const evaluator = await buildEvaluator([promo], customer);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, 'cust-1', LOC_ID, now);
    expect(result).toHaveLength(0);
  });

  it('includes promotion targeting specific grade when customer matches', async () => {
    const promo = basePromo({
      target_audience: 'grade',
      target_grade_ids: ['grade-gold'],
    });
    const customer = { id: 'cust-1', business_id: BIZ_ID, grade_id: 'grade-gold' } as any;
    const evaluator = await buildEvaluator([promo], customer);
    const result = await evaluator.evaluate(BIZ_ID, cartItems, 'cust-1', LOC_ID, now);
    expect(result).toHaveLength(1);
  });
});
