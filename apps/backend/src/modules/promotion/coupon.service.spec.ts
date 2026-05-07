import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponType } from '../../common/entities/coupon-type.entity';
import { Coupon } from '../../common/entities/coupon.entity';

const BIZ_ID = 'biz-1';
const CT_ID = 'ct-1';

function makeCouponType(overrides: Partial<CouponType> = {}): CouponType {
  return {
    id: CT_ID,
    business_id: BIZ_ID,
    code: 'CPN-ABCDEF',
    name: 'Summer Discount',
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

function makeCouponRepo(overrides: Record<string, any> = {}) {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: 'coupon-uuid', ...e })),
    count: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makeCouponTypeRepo(overrides: Record<string, any> = {}) {
  return {
    findOne: jest.fn().mockResolvedValue(makeCouponType()),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => ({ id: CT_ID, ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: CT_ID, ...e })),
    count: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

async function buildService(
  ctRepoOverrides: Record<string, any> = {},
  couponRepoOverrides: Record<string, any> = {},
) {
  const ctRepo = makeCouponTypeRepo(ctRepoOverrides);
  const couponRepo = makeCouponRepo(couponRepoOverrides);

  const module = await Test.createTestingModule({
    providers: [
      CouponService,
      { provide: getRepositoryToken(CouponType), useValue: ctRepo },
      { provide: getRepositoryToken(Coupon), useValue: couponRepo },
    ],
  }).compile();

  return { service: module.get(CouponService), ctRepo, couponRepo };
}

describe('CouponService', () => {
  describe('createCouponType [CPN-003]', () => {
    it('creates coupon type successfully', async () => {
      const { service, ctRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(null), // no dupe code
      });
      const dto = { name: 'New Coupon', discount_type: 'percent_off', discount_value: 15 };
      const result = await service.createCouponType(BIZ_ID, dto as any);
      expect(ctRepo.create).toHaveBeenCalledWith(expect.objectContaining({ business_id: BIZ_ID }));
      expect(ctRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateCouponType [CPN-004]', () => {
    it('updates successfully when no coupons issued', async () => {
      const { service, ctRepo } = await buildService(
        { findOne: jest.fn().mockResolvedValue(makeCouponType()) },
        { count: jest.fn().mockResolvedValue(0) },
      );
      const result = await service.updateCouponType(CT_ID, BIZ_ID, { name: 'Updated' });
      expect(ctRepo.save).toHaveBeenCalled();
    });

    it('rejects locked fields when coupons have been issued — 422', async () => {
      const { service } = await buildService(
        { findOne: jest.fn().mockResolvedValue(makeCouponType()) },
        { count: jest.fn().mockResolvedValue(5) }, // 5 coupons issued
      );
      await expect(
        service.updateCouponType(CT_ID, BIZ_ID, { discount_value: 20 } as any),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('cloneCouponType [CPN-005]', () => {
    it('clone has name "(Copy)" and is_active=false', async () => {
      const original = makeCouponType({ name: 'Summer' });
      const { service, ctRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(original),
      });
      await service.cloneCouponType(CT_ID, BIZ_ID);
      const created = ctRepo.create.mock.calls[0][0];
      expect(created.name).toBe('Summer (Copy)');
      expect(created.is_active).toBe(false);
    });
  });

  describe('deactivateCouponType [CPN-006]', () => {
    it('sets is_active=false', async () => {
      const ct = makeCouponType({ is_active: true });
      const { service, ctRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(ct),
        save: jest.fn((e: any) => Promise.resolve(e)),
      });
      const result = await service.deactivateCouponType(CT_ID, BIZ_ID);
      expect(result.is_active).toBe(false);
    });
  });

  describe('issueCoupon [CPN-010]', () => {
    it('issues coupon with 12-char alphanumeric code', async () => {
      const { service, couponRepo } = await buildService();
      const result = await service.issueCoupon(CT_ID, BIZ_ID, {});
      const created = couponRepo.create.mock.calls[0][0];
      expect(created.coupon_code).toHaveLength(12);
      expect(created.coupon_code).toMatch(/^[A-Z0-9]{12}$/);
    });

    it('issues to anonymous customer when no customer_id given', async () => {
      const { service, couponRepo } = await buildService();
      await service.issueCoupon(CT_ID, BIZ_ID, {});
      const created = couponRepo.create.mock.calls[0][0];
      expect(created.customer_id).toBeNull();
    });
  });

  describe('lookupCoupon [CPN-020]', () => {
    it('returns 404 when coupon not found', async () => {
      const { service } = await buildService({}, { findOne: jest.fn().mockResolvedValue(null) });
      await expect(service.lookupCoupon('NOTEXIST', BIZ_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns 410 when coupon already redeemed', async () => {
      const redeemed = {
        id: 'c-1',
        coupon_code: 'ABC123',
        business_id: BIZ_ID,
        status: 'redeemed',
        coupon_type: { discount_type: 'percent_off', discount_value: 10 },
        expires_at: new Date('2099-12-31'),
        customer_id: null,
      };
      const { service } = await buildService({}, { findOne: jest.fn().mockResolvedValue(redeemed) });
      await expect(service.lookupCoupon('ABC123', BIZ_ID)).rejects.toMatchObject({ status: 410 });
    });
  });

  describe('cross-tenant [CPN-002]', () => {
    it('returns 404 for coupon type in different business', async () => {
      const { service } = await buildService({ findOne: jest.fn().mockResolvedValue(null) });
      await expect(service.getCouponType(CT_ID, 'other-biz')).rejects.toThrow(NotFoundException);
    });
  });
});
