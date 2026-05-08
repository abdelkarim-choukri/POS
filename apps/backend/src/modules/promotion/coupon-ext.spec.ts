import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { CouponExtService, COUPON_BULK_QUEUE } from './coupon-ext.service';
import { CouponService } from './coupon.service';
import { JobService } from '../jobs/job.service';
import { CouponType } from '../../common/entities/coupon-type.entity';
import { Coupon } from '../../common/entities/coupon.entity';
import { CouponRedemption } from '../../common/entities/coupon-redemption.entity';
import { DiscountWriteOff } from '../../common/entities/discount-write-off.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';

const BIZ_ID = 'biz-ext-1';
const CT_ID = 'ct-ext-1';

function makeCouponType(overrides = {}): CouponType {
  return {
    id: CT_ID,
    business_id: BIZ_ID,
    code: 'CPN-EXT01',
    name: 'Test Type',
    description: null,
    discount_type: 'percent_off',
    discount_value: 10 as any,
    free_item_product_id: null,
    free_item_product: null as any,
    free_item_variant_id: null,
    free_item_variant: null as any,
    min_order_total_ttc: 0 as any,
    applicable_category_ids: [],
    applicable_product_ids: [],
    validity_days_from_issue: 30,
    share_case: 'N',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    business: null as any,
    ...overrides,
  };
}

function makeQbMock(rawResult: any) {
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
  };
  return qb;
}

async function buildService(overrides: Record<string, any> = {}) {
  const couponTypeRepo = {
    findOne: jest.fn().mockResolvedValue(makeCouponType()),
    ...overrides.couponTypeRepo,
  };
  const couponRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: 'coupon-uuid', ...e })),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(makeQbMock([])),
    ...overrides.couponRepo,
  };
  const redemptionRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(makeQbMock([])),
    ...overrides.redemptionRepo,
  };
  const writeOffRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(makeQbMock({ count: '0', total_written_off_amount: '0' })),
    ...overrides.writeOffRepo,
  };
  const customerRepo = {
    find: jest.fn().mockResolvedValue([]),
    ...overrides.customerRepo,
  };
  const labelAssignRepo = {
    find: jest.fn().mockResolvedValue([]),
    ...overrides.labelAssignRepo,
  };
  const jobService = {
    createJob: jest.fn().mockResolvedValue({ id: 'job-uuid-1' }),
    updateJobStatus: jest.fn().mockResolvedValue({}),
    ...overrides.jobService,
  };
  const bulkQueue = {
    add: jest.fn().mockResolvedValue({ id: 'bull-job-1' }),
    ...overrides.bulkQueue,
  };
  const couponService = {
    issueCoupon: jest.fn().mockResolvedValue({ id: 'coupon-uuid', coupon_code: 'AAAAAAAAAAAA' }),
    ...overrides.couponService,
  };

  const module = await Test.createTestingModule({
    providers: [
      CouponExtService,
      { provide: getRepositoryToken(CouponType), useValue: couponTypeRepo },
      { provide: getRepositoryToken(Coupon), useValue: couponRepo },
      { provide: getRepositoryToken(CouponRedemption), useValue: redemptionRepo },
      { provide: getRepositoryToken(DiscountWriteOff), useValue: writeOffRepo },
      { provide: getRepositoryToken(Customer), useValue: customerRepo },
      { provide: getRepositoryToken(CustomerLabelAssignment), useValue: labelAssignRepo },
      { provide: JobService, useValue: jobService },
      { provide: getQueueToken(COUPON_BULK_QUEUE), useValue: bulkQueue },
      { provide: CouponService, useValue: couponService },
    ],
  }).compile();

  return {
    service: module.get(CouponExtService),
    couponTypeRepo,
    couponRepo,
    redemptionRepo,
    writeOffRepo,
    jobService,
    bulkQueue,
    couponService,
  };
}

describe('CouponExtService', () => {
  describe('bulkIssueCoupons [CPN-021]', () => {
    it('issues coupons synchronously for ≤100 customers and returns results', async () => {
      const customerIds = ['cust-1', 'cust-2', 'cust-3'];
      const { service, couponService } = await buildService();

      const result = await service.bulkIssueCoupons(BIZ_ID, {
        coupon_type_id: CT_ID,
        customer_ids: customerIds,
      });

      expect(couponService.issueCoupon).toHaveBeenCalledTimes(3);
      expect(result).toHaveProperty('issued_coupons');
      expect((result as any).issued_coupons).toHaveLength(3);
      expect(result).toHaveProperty('total', 3);
    });

    it('creates a background job for >100 customers and returns job_id', async () => {
      const customerIds = Array.from({ length: 101 }, (_, i) => `cust-${i}`);
      const { service, jobService, bulkQueue } = await buildService();

      const result = await service.bulkIssueCoupons(BIZ_ID, {
        coupon_type_id: CT_ID,
        customer_ids: customerIds,
      });

      expect(jobService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({ job_type: 'bulk_coupon_issue', business_id: BIZ_ID }),
      );
      expect(bulkQueue.add).toHaveBeenCalled();
      expect(result).toHaveProperty('job_id', 'job-uuid-1');
      expect(result).toHaveProperty('total_queued', 101);
    });

    it('returns 404 when coupon type not found', async () => {
      const { service } = await buildService({
        couponTypeRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.bulkIssueCoupons(BIZ_ID, { coupon_type_id: CT_ID, customer_ids: ['c1'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('issueToSegment [CPN-022]', () => {
    it('always creates a background job and returns job_id', async () => {
      const { service, jobService, bulkQueue } = await buildService();

      const result = await service.issueToSegment(BIZ_ID, {
        coupon_type_id: CT_ID,
        target_audience: 'all',
      });

      expect(jobService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({ job_type: 'bulk_coupon_issue' }),
      );
      expect(bulkQueue.add).toHaveBeenCalled();
      expect(result).toHaveProperty('job_id', 'job-uuid-1');
    });

    it('returns 404 when coupon type not found or inactive', async () => {
      const { service } = await buildService({
        couponTypeRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.issueToSegment(BIZ_ID, { coupon_type_id: CT_ID, target_audience: 'grade' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('couponReport [CPN-040]', () => {
    it('returns per-type breakdown with totals and redemption_rate', async () => {
      const rawRows = [
        {
          coupon_type_id: CT_ID,
          coupon_type_name: 'Test Type',
          total_issued: '10',
          total_redeemed: '4',
          total_expired: '2',
          total_voided: '1',
          total_discount_given: '50.00',
        },
      ];
      const qb = makeQbMock(rawRows);
      const { service } = await buildService({
        couponRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
      });

      const result = await service.couponReport(BIZ_ID, {
        from_date: '2026-01-01',
        to_date: '2026-12-31',
      });

      expect(result.per_coupon_type).toHaveLength(1);
      const row = result.per_coupon_type[0];
      expect(row.total_issued).toBe(10);
      expect(row.total_redeemed).toBe(4);
      expect(row.redemption_rate).toBe(40);
      expect(result.totals.total_issued).toBe(10);
      expect(result.totals.total_discount_given).toBe(50);
    });

    it('returns empty results when no coupons in range', async () => {
      const { service } = await buildService();
      const result = await service.couponReport(BIZ_ID, {
        from_date: '2025-01-01',
        to_date: '2025-01-31',
      });
      expect(result.per_coupon_type).toHaveLength(0);
      expect(result.totals.total_issued).toBe(0);
    });
  });

  describe('discountWriteOffReport [XCC-040]', () => {
    function makeWriteOffRepo(byTerminalRows: any[], grandTotalRow: any) {
      // The service calls createQueryBuilder twice: once for grouped query, once for grand total.
      // Return a fresh qb each call.
      const qb1: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(byTerminalRows),
      };
      const qb2: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(grandTotalRow),
      };
      let call = 0;
      return { createQueryBuilder: jest.fn().mockImplementation(() => (call++ === 0 ? qb1 : qb2)) };
    }

    it('returns per-terminal breakdown and grand totals', async () => {
      const { service } = await buildService({
        writeOffRepo: makeWriteOffRepo(
          [{ terminal_id: 'term-1', count: '3', total_written_off_amount: '75.00' }],
          { count: '3', total_written_off_amount: '75.00' },
        ),
      });

      const result = await service.discountWriteOffReport(BIZ_ID, {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(result.by_terminal).toHaveLength(1);
      expect(result.by_terminal[0].terminal_id).toBe('term-1');
      expect(result.by_terminal[0].total_written_off_amount).toBe(75);
      expect(result.totals.count).toBe(3);
      expect(result.totals.total_written_off_amount).toBe(75);
    });

    it('cross-tenant: returns empty results for wrong business', async () => {
      const { service } = await buildService({
        writeOffRepo: makeWriteOffRepo(
          [],
          { count: '0', total_written_off_amount: '0' },
        ),
      });

      const result = await service.discountWriteOffReport('other-biz', {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(result.by_terminal).toHaveLength(0);
      expect(result.totals.count).toBe(0);
    });
  });
});
