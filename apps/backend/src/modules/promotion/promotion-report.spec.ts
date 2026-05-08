import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PromotionService } from './promotion.service';
import { Promotion } from '../../common/entities/promotion.entity';
import { PromotionRedemption } from '../../common/entities/promotion-redemption.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerLabel } from '../../common/entities/customer-label.entity';
import { Customer } from '../../common/entities/customer.entity';
import { Location } from '../../common/entities/location.entity';

const BIZ_ID = 'biz-report-1';
const PROMO_A = 'promo-uuid-a';
const PROMO_B = 'promo-uuid-b';

function makeQbWithRaw(rows: any[]) {
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
    getRawOne: jest.fn().mockResolvedValue(rows[0] ?? null),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  return qb;
}

function makeEmptyRepo() {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve(e)),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(makeQbWithRaw([])),
  };
}

async function buildService(redemptionQbRows: any[] = []) {
  const redemptionRepo = {
    ...makeEmptyRepo(),
    createQueryBuilder: jest.fn().mockReturnValue(makeQbWithRaw(redemptionQbRows)),
  };
  const promoRepo = {
    ...makeEmptyRepo(),
    createQueryBuilder: jest.fn().mockReturnValue(makeQbWithRaw([])),
  };

  const module = await Test.createTestingModule({
    providers: [
      PromotionService,
      { provide: getRepositoryToken(Promotion), useValue: promoRepo },
      { provide: getRepositoryToken(PromotionRedemption), useValue: redemptionRepo },
      { provide: getRepositoryToken(Category), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Product), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(CustomerGrade), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(CustomerLabel), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Customer), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Location), useValue: makeEmptyRepo() },
    ],
  }).compile();

  return { service: module.get(PromotionService), redemptionRepo };
}

describe('PromotionService.promotionReport [PROM-050]', () => {
  const query = { from_date: '2026-01-01', to_date: '2026-01-31' };

  it('aggregates per-promotion breakdown correctly', async () => {
    const rows = [
      {
        promotion_id: PROMO_A,
        promotion_name: 'Happy Hour',
        total_redemptions: '5',
        total_discount_given: '100.00',
        unique_customers: '4',
        revenue_with_promotion: '1500.00',
      },
      {
        promotion_id: PROMO_B,
        promotion_name: 'Weekend Deal',
        total_redemptions: '3',
        total_discount_given: '60.00',
        unique_customers: '3',
        revenue_with_promotion: '900.00',
      },
    ];
    const { service } = await buildService(rows);

    const result = await service.promotionReport(BIZ_ID, query);

    expect(result.per_promotion).toHaveLength(2);
    expect(result.per_promotion[0].promotion_id).toBe(PROMO_A);
    expect(result.per_promotion[0].total_redemptions).toBe(5);
    expect(result.per_promotion[1].total_redemptions).toBe(3);
  });

  it('computes grand totals across all promotions', async () => {
    const rows = [
      {
        promotion_id: PROMO_A,
        promotion_name: 'Promo A',
        total_redemptions: '10',
        total_discount_given: '200.00',
        unique_customers: '8',
        revenue_with_promotion: '2000.00',
      },
      {
        promotion_id: PROMO_B,
        promotion_name: 'Promo B',
        total_redemptions: '5',
        total_discount_given: '50.00',
        unique_customers: '5',
        revenue_with_promotion: '500.00',
      },
    ];
    const { service } = await buildService(rows);

    const result = await service.promotionReport(BIZ_ID, query);

    expect(result.totals.total_redemptions).toBe(15);
    expect(result.totals.total_discount_given).toBe(250);
    expect(result.totals.revenue_with_promotion).toBe(2500);
  });

  it('returns empty results when no redemptions in range', async () => {
    const { service } = await buildService([]);

    const result = await service.promotionReport(BIZ_ID, query);

    expect(result.per_promotion).toHaveLength(0);
    expect(result.totals.total_redemptions).toBe(0);
    expect(result.totals.total_discount_given).toBe(0);
  });

  it('filters by promotion_id when provided', async () => {
    const rows = [
      {
        promotion_id: PROMO_A,
        promotion_name: 'Happy Hour',
        total_redemptions: '5',
        total_discount_given: '100.00',
        unique_customers: '4',
        revenue_with_promotion: '1500.00',
      },
    ];
    const { service, redemptionRepo } = await buildService(rows);

    await service.promotionReport(BIZ_ID, { ...query, promotion_id: PROMO_A });

    const qb = redemptionRepo.createQueryBuilder.mock.results[0].value;
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('pr.promotion_id = :promoId'),
      expect.objectContaining({ promoId: PROMO_A }),
    );
  });
});
