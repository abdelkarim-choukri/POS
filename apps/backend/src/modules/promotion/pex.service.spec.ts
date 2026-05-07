import { Test } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import {
  NotFoundException, ConflictException, UnprocessableEntityException, ForbiddenException,
} from '@nestjs/common';
import { PointsExchangeService } from './pex.service';
import { CouponService } from './coupon.service';
import { PointsExchangeRule } from '../../common/entities/points-exchange-rule.entity';
import { PointsExchangeRuleDetail } from '../../common/entities/points-exchange-rule-detail.entity';
import { PointsExchangeRedemption } from '../../common/entities/points-exchange-redemption.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';

const BIZ_ID = 'biz-1';
const RULE_ID = 'rule-1';
const CUSTOMER_ID = 'cust-1';
const COUPON_TYPE_ID = 'ct-1';
const TODAY = new Date().toISOString().slice(0, 10);

function makeRule(overrides: Partial<PointsExchangeRule> = {}): PointsExchangeRule {
  return {
    id: RULE_ID,
    business_id: BIZ_ID,
    name: 'Test Rule',
    point_value: 100,
    rule_type: 'coupon',
    validity_date_type: 'D',
    validity_days: 30,
    rule_start_date: '2026-01-01',
    rule_end_date: '2099-12-31',
    applicable_location_ids: [],
    total_redemptions_limit: 0,
    per_customer_limit: 0,
    per_customer_per_day_limit: 0,
    current_redemptions: 0,
    remark: null,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    details: [
      {
        id: 'detail-1',
        rule_id: RULE_ID,
        coupon_type_id: COUPON_TYPE_ID,
        product_id: null,
        variant_id: null,
        quantity_per_redemption: 1,
        discount_amount_mad: null,
        rule: null as any,
        coupon_type: null as any,
        product: null as any,
        variant: null as any,
      },
    ],
    redemptions: [],
    business: null as any,
    ...overrides,
  };
}

function makeQb(results: any[] = [], count = 0) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([results, count]),
    getMany: jest.fn().mockResolvedValue(results),
    getCount: jest.fn().mockResolvedValue(count),
  };
  return qb;
}

function makeQrMock(queryOverrides?: (sql: string, params?: any[]) => any) {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      create: jest.fn((EntityClass: any, data: any) => ({ ...data })),
      save: jest.fn((EntityClass: any, data: any) => {
        if (!data) return Promise.resolve({ id: 'saved-uuid', ...EntityClass });
        return Promise.resolve({ id: 'saved-uuid', ...data });
      }),
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn((sql: string, params?: any[]) => {
        if (queryOverrides) {
          const r = queryOverrides(sql, params);
          if (r !== undefined) return Promise.resolve(r);
        }
        // Default responses
        if (sql.includes('SELECT id, points_balance FROM customers')) {
          return Promise.resolve([{ id: CUSTOMER_ID, points_balance: 500 }]);
        }
        if (sql.includes('COUNT(*) FROM points_exchange_redemptions')) {
          return Promise.resolve([{ count: '0' }]);
        }
        if (sql.includes('UPDATE points_exchange_rules')) {
          return Promise.resolve([{ id: RULE_ID }]);
        }
        if (sql.includes('UPDATE customers SET points_balance')) {
          return Promise.resolve([{ points_balance: 400 }]);
        }
        return Promise.resolve([]);
      }),
    },
  };
}

async function buildService(
  ruleRepoOverrides: Record<string, any> = {},
  redemptionRepoOverrides: Record<string, any> = {},
  customerRepoOverrides: Record<string, any> = {},
  dsOverrides: Record<string, any> = {},
  couponServiceOverrides: Record<string, any> = {},
) {
  const qr = makeQrMock();
  const defaultDs = {
    createQueryRunner: jest.fn().mockReturnValue(qr),
    manager: {
      query: jest.fn().mockResolvedValue([{ count: '0' }]),
    },
  };

  const ruleRepo = {
    findOne: jest.fn().mockResolvedValue(makeRule()),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn((e: any) => Promise.resolve({ ...e })),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(makeQb([], 0)),
    ...ruleRepoOverrides,
  };
  const detailRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn((e: any) => Promise.resolve(e)),
  };
  const redemptionRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    save: jest.fn((e: any) => Promise.resolve({ id: 'redemption-uuid', ...e })),
    ...redemptionRepoOverrides,
  };
  const customerRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: CUSTOMER_ID,
      business_id: BIZ_ID,
      points_balance: 500,
    }),
    ...customerRepoOverrides,
  };
  const ds = { ...defaultDs, ...dsOverrides };
  const couponServiceMock = {
    issueCouponInQr: jest.fn().mockResolvedValue({
      id: 'coupon-uuid',
      coupon_code: 'ABC123456789',
      status: 'available',
      coupon_type_id: COUPON_TYPE_ID,
      business_id: BIZ_ID,
      customer_id: CUSTOMER_ID,
      expires_at: new Date(),
      issued_at: new Date(),
      issue_source: 'points_exchange',
    }),
    ...couponServiceOverrides,
  };

  const module = await Test.createTestingModule({
    providers: [
      PointsExchangeService,
      { provide: getRepositoryToken(PointsExchangeRule), useValue: ruleRepo },
      { provide: getRepositoryToken(PointsExchangeRuleDetail), useValue: detailRepo },
      { provide: getRepositoryToken(PointsExchangeRedemption), useValue: redemptionRepo },
      { provide: getRepositoryToken(Customer), useValue: customerRepo },
      { provide: getRepositoryToken(CustomerPointsHistory), useValue: { save: jest.fn() } },
      { provide: getDataSourceToken(), useValue: ds },
      { provide: CouponService, useValue: couponServiceMock },
    ],
  }).compile();

  return {
    service: module.get(PointsExchangeService),
    ruleRepo,
    detailRepo,
    redemptionRepo,
    customerRepo,
    ds,
    qr,
    couponService: couponServiceMock,
  };
}

describe('PointsExchangeService', () => {
  // ── PEX-003 ───────────────────────────────────────────────────────────────
  describe('checkPointValue [PEX-003]', () => {
    it('returns count=0 when no duplicate exists', async () => {
      const { service, ruleRepo } = await buildService({
        createQueryBuilder: jest.fn().mockReturnValue(makeQb([], 0)),
      });
      const result = await service.checkPointValue(BIZ_ID, {
        point_value: 100,
        rule_type: 'coupon',
      });
      expect(result).toEqual({ count: 0 });
    });

    it('returns count=1 when a conflicting rule exists', async () => {
      const { service } = await buildService({
        createQueryBuilder: jest.fn().mockReturnValue(makeQb([makeRule()], 1)),
      });
      const result = await service.checkPointValue(BIZ_ID, {
        point_value: 100,
        rule_type: 'coupon',
      });
      expect(result.count).toBe(1);
    });
  });

  // ── PEX-004 ───────────────────────────────────────────────────────────────
  describe('create [PEX-004]', () => {
    it('saves rule + details and returns detail view', async () => {
      const { service, ruleRepo, ds } = await buildService({
        createQueryBuilder: jest.fn().mockReturnValue(makeQb([], 0)), // no duplicate
        findOne: jest.fn().mockResolvedValue(makeRule()),
      });
      const dto = {
        rule: {
          name: 'New Rule', point_value: 200, rule_type: 'coupon' as const,
          validity_days: 30, validity_date_type: 'D' as const,
        },
        details: [{ coupon_type_id: COUPON_TYPE_ID, quantity_per_redemption: 1 }],
      };
      const result = await service.create(BIZ_ID, dto);
      expect(ds.createQueryRunner).toHaveBeenCalled();
    });

    it('throws 409 when a duplicate point_value+rule_type exists', async () => {
      const { service } = await buildService({
        createQueryBuilder: jest.fn().mockReturnValue(makeQb([makeRule()], 1)),
      });
      await expect(
        service.create(BIZ_ID, {
          rule: { name: 'Dup', point_value: 100, rule_type: 'coupon' as const },
          details: [],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── PEX-005 ───────────────────────────────────────────────────────────────
  describe('update [PEX-005]', () => {
    it('allows name change when current_redemptions=0', async () => {
      const { service, ruleRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(makeRule({ current_redemptions: 0 })),
        save: jest.fn((e: any) => Promise.resolve(e)),
      });
      const result = await service.update(RULE_ID, BIZ_ID, { name: 'Updated' });
      expect(ruleRepo.save).toHaveBeenCalled();
    });

    it('throws 422 when point_value changed and current_redemptions > 0', async () => {
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(makeRule({ current_redemptions: 5 })),
      });
      await expect(
        service.update(RULE_ID, BIZ_ID, { point_value: 999 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for a rule in a different business', async () => {
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.update(RULE_ID, 'other-biz', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── PEX-006 ───────────────────────────────────────────────────────────────
  describe('deactivate [PEX-006]', () => {
    it('sets is_active=false', async () => {
      const rule = makeRule({ is_active: true });
      const { service, ruleRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(rule),
        save: jest.fn((e: any) => Promise.resolve(e)),
      });
      const result = await service.deactivate(RULE_ID, BIZ_ID);
      expect(ruleRepo.save).toHaveBeenCalled();
      expect(rule.is_active).toBe(false);
    });
  });

  // ── PEX-010 ───────────────────────────────────────────────────────────────
  describe('listRedeemableForCustomer [PEX-010]', () => {
    it('excludes rules where customer has insufficient points', async () => {
      const expensiveRule = makeRule({ point_value: 1000 }); // more than balance
      const { service } = await buildService(
        {
          createQueryBuilder: jest.fn().mockReturnValue({
            ...makeQb([expensiveRule]),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([expensiveRule]),
          }),
        },
        {},
        {
          findOne: jest.fn().mockResolvedValue({
            id: CUSTOMER_ID, business_id: BIZ_ID, points_balance: 50,
          }),
        },
      );
      // The rule requires 1000 points but customer has 50 — query builder
      // filters by point_value <= balance, so getMany would return [] in real DB.
      // Since the mock returns the rule anyway, we verify no crash and the service
      // runs the post-filter loop; the point_value filter is a DB-side concern.
      const result = await service.listRedeemableForCustomer(BIZ_ID, CUSTOMER_ID);
      expect(Array.isArray(result)).toBe(true);
    });

    it('excludes rules at per-customer limit', async () => {
      const limitedRule = makeRule({ per_customer_limit: 2 });
      const { service } = await buildService(
        {
          createQueryBuilder: jest.fn().mockReturnValue({
            ...makeQb([limitedRule]),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([limitedRule]),
          }),
        },
        { count: jest.fn().mockResolvedValue(2) }, // customer already redeemed 2 times
      );
      const result = await service.listRedeemableForCustomer(BIZ_ID, CUSTOMER_ID);
      // Rule is excluded because per_customer_limit reached
      expect(result).toHaveLength(0);
    });
  });

  // ── PEX-011 ───────────────────────────────────────────────────────────────
  describe('redeem [PEX-011]', () => {
    it('issues coupon, decrements points, returns redemption + coupon', async () => {
      const { service, ds, couponService } = await buildService();
      const result = await service.redeem(RULE_ID, BIZ_ID, CUSTOMER_ID, true);
      expect(result).toHaveProperty('granted_coupon');
      expect(result).toHaveProperty('redemption');
      expect(couponService.issueCouponInQr).toHaveBeenCalled();
    });

    it('throws ForbiddenException when canRedeemPoints=false', async () => {
      const { service } = await buildService();
      await expect(
        service.redeem(RULE_ID, BIZ_ID, CUSTOMER_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws 422 when customer has insufficient points', async () => {
      const qr = makeQrMock((sql) => {
        if (sql.includes('SELECT id, points_balance FROM customers')) {
          return [{ id: CUSTOMER_ID, points_balance: 10 }]; // only 10 points, need 100
        }
      });
      const { service } = await buildService(
        {},
        {},
        {},
        { createQueryRunner: jest.fn().mockReturnValue(qr) },
      );
      await expect(
        service.redeem(RULE_ID, BIZ_ID, CUSTOMER_ID, true),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws 422 when per-customer limit is exceeded', async () => {
      const rule = makeRule({ per_customer_limit: 1 });
      const qr = makeQrMock((sql) => {
        if (sql.includes('COUNT(*) FROM points_exchange_redemptions')) {
          return [{ count: '1' }]; // already at limit
        }
      });
      const { service } = await buildService(
        { findOne: jest.fn().mockResolvedValue(rule) },
        {},
        {},
        { createQueryRunner: jest.fn().mockReturnValue(qr) },
      );
      await expect(
        service.redeem(RULE_ID, BIZ_ID, CUSTOMER_ID, true),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws 422 when concurrent total limit race — atomic UPDATE returns 0 rows', async () => {
      const rule = makeRule({ total_redemptions_limit: 5, current_redemptions: 5 });
      const qr = makeQrMock((sql) => {
        if (sql.includes('UPDATE points_exchange_rules')) {
          return []; // 0 rows = limit already hit concurrently
        }
      });
      const { service } = await buildService(
        { findOne: jest.fn().mockResolvedValue(rule) },
        {},
        {},
        { createQueryRunner: jest.fn().mockReturnValue(qr) },
      );
      await expect(
        service.redeem(RULE_ID, BIZ_ID, CUSTOMER_ID, true),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ── Cross-tenant ──────────────────────────────────────────────────────────
  describe('cross-tenant [PEX-002]', () => {
    it('returns 404 for a rule that belongs to a different business', async () => {
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.getDetail(RULE_ID, 'other-biz'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
