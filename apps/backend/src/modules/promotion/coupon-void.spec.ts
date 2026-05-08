import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponType } from '../../common/entities/coupon-type.entity';
import { Coupon } from '../../common/entities/coupon.entity';

const BIZ_ID = 'biz-void-1';
const COUPON_ID = 'coupon-uuid-1';
const USER_ID = 'user-uuid-1';

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: COUPON_ID,
    business_id: BIZ_ID,
    coupon_type_id: 'ct-1',
    coupon_code: 'ABCDEF123456',
    customer_id: null,
    issued_at: new Date('2026-01-01'),
    issued_by_user_id: null,
    issue_source: 'manual',
    expires_at: new Date('2026-12-31'),
    redeemed_at: null,
    redeemed_in_transaction_id: null,
    redeemed_by_terminal_id: null,
    status: 'available',
    business: null as any,
    coupon_type: null as any,
    customer: null as any,
    issued_by: null as any,
    redeemed_in_transaction: null as any,
    redeemed_by_terminal: null as any,
    ...overrides,
  };
}

async function buildService(couponRepoOverrides: Record<string, any> = {}) {
  const couponRepo = {
    findOne: jest.fn().mockResolvedValue(makeCoupon()),
    save: jest.fn((e: any) => Promise.resolve(e)),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => ({ ...d })),
    count: jest.fn().mockResolvedValue(0),
    ...couponRepoOverrides,
  };
  const ctRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve(e)),
    count: jest.fn().mockResolvedValue(0),
  };

  const module = await Test.createTestingModule({
    providers: [
      CouponService,
      { provide: getRepositoryToken(CouponType), useValue: ctRepo },
      { provide: getRepositoryToken(Coupon), useValue: couponRepo },
    ],
  }).compile();

  return { service: module.get(CouponService), couponRepo };
}

describe('CouponService.voidCoupon [CPN-033]', () => {
  const voidDto = { reason: 'Fraud suspected' };

  it('voids an available coupon and returns voided_by_user_id in response', async () => {
    const { service, couponRepo } = await buildService();
    const result = await service.voidCoupon(COUPON_ID, BIZ_ID, voidDto, USER_ID);

    expect(couponRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'voided' }));
    expect(result.voided_by_user_id).toBe(USER_ID);
    expect(result.reason).toBe(voidDto.reason);
  });

  it('returns 404 when coupon does not belong to business', async () => {
    const { service } = await buildService({
      findOne: jest.fn().mockResolvedValue(null),
    });
    await expect(service.voidCoupon(COUPON_ID, 'other-biz', voidDto, USER_ID))
      .rejects.toThrow(NotFoundException);
  });

  it('returns 422 when coupon is already redeemed', async () => {
    const { service } = await buildService({
      findOne: jest.fn().mockResolvedValue(makeCoupon({ status: 'redeemed' })),
    });
    await expect(service.voidCoupon(COUPON_ID, BIZ_ID, voidDto, USER_ID))
      .rejects.toThrow(UnprocessableEntityException);
  });

  it('returns 422 when coupon is already voided', async () => {
    const { service } = await buildService({
      findOne: jest.fn().mockResolvedValue(makeCoupon({ status: 'voided' })),
    });
    await expect(service.voidCoupon(COUPON_ID, BIZ_ID, voidDto, USER_ID))
      .rejects.toThrow(UnprocessableEntityException);
  });

  it('returns 422 when coupon is expired', async () => {
    const { service } = await buildService({
      findOne: jest.fn().mockResolvedValue(makeCoupon({ status: 'expired' })),
    });
    await expect(service.voidCoupon(COUPON_ID, BIZ_ID, voidDto, USER_ID))
      .rejects.toThrow(UnprocessableEntityException);
  });
});
