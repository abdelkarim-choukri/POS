import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException, ConflictException,
  BadRequestException, UnprocessableEntityException,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { Promotion } from '../../common/entities/promotion.entity';
import { PromotionRedemption } from '../../common/entities/promotion-redemption.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerLabel } from '../../common/entities/customer-label.entity';
import { Customer } from '../../common/entities/customer.entity';
import { Location } from '../../common/entities/location.entity';

const BIZ_ID = 'biz-1';
const USER_ID = 'user-1';
const PROMO_ID = 'promo-1';

function makePromo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: PROMO_ID,
    business_id: BIZ_ID,
    code: 'PROM-ABC',
    name: 'Test Promo',
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
    status: 'draft',
    remark: null,
    created_by_user_id: USER_ID,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    redemptions: [],
    business: null as any,
    target_category: null as any,
    target_product: null as any,
    created_by: null as any,
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
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([results, count]),
    getRawOne: jest.fn().mockResolvedValue({
      total_redemptions: '0', total_discount_given: '0', unique_customers: '0',
    }),
  };
  return qb;
}

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    create: jest.fn((d: any) => ({ id: PROMO_ID, ...d })),
    save: jest.fn((e: any) => Promise.resolve(e)),
    findOne: jest.fn(),
    findByIds: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => makeQb()),
    ...overrides,
  };
}

function makeEmptyRepo() {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    findByIds: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => makeQb()),
  };
}

async function buildService(promoRepoOverrides: Record<string, any> = {}) {
  const promoRepo = makeRepo(promoRepoOverrides);
  const qbMock = makeQb();
  promoRepo.createQueryBuilder = jest.fn(() => qbMock);

  const module = await Test.createTestingModule({
    providers: [
      PromotionService,
      { provide: getRepositoryToken(Promotion), useValue: promoRepo },
      { provide: getRepositoryToken(PromotionRedemption), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Category), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Product), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(CustomerGrade), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(CustomerLabel), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Customer), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Location), useValue: makeEmptyRepo() },
    ],
  }).compile();

  return { service: module.get(PromotionService), promoRepo };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PromotionService', () => {
  describe('create', () => {
    it('creates promotion with status draft', async () => {
      const { service, promoRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(null), // no dupe code
      });
      const dto = {
        name: 'Summer Sale',
        promotion_type: 'percent_off_order',
        value: 15,
        start_date: '2026-06-01',
        end_date: '2026-06-30',
      };
      const result = await service.create(BIZ_ID, dto as any, USER_ID);
      expect(promoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft', business_id: BIZ_ID }),
      );
      expect(result.status).toBe('draft');
    });

    it('rejects when start_date > end_date', async () => {
      const { service } = await buildService();
      await expect(
        service.create(BIZ_ID, {
          name: 'Bad', promotion_type: 'percent_off_order', value: 10,
          start_date: '2026-12-31', end_date: '2026-01-01',
        } as any, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects percentage > 100 for percent type', async () => {
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.create(BIZ_ID, {
          name: 'Too Much', promotion_type: 'percent_off_order', value: 150,
          start_date: '2026-01-01', end_date: '2026-12-31',
        } as any, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate code', async () => {
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(makePromo()),
      });
      await expect(
        service.create(BIZ_ID, {
          name: 'Dupe', code: 'PROM-ABC', promotion_type: 'percent_off_order',
          value: 10, start_date: '2026-01-01', end_date: '2026-12-31',
        } as any, USER_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('list', () => {
    it('returns paginated results', async () => {
      const promos = [makePromo(), makePromo({ id: 'promo-2', name: 'B' })];
      const { service, promoRepo } = await buildService();
      const qb = makeQb(promos, 2);
      promoRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list(BIZ_ID, { page: 1, limit: 20 });
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('attaches is_currently_running=true for active promo in range', async () => {
      const activePromo = makePromo({
        status: 'active',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });
      const { service, promoRepo } = await buildService();
      const qb = makeQb([activePromo], 1);
      promoRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list(BIZ_ID, {});
      expect(result.data[0].is_currently_running).toBe(true);
    });

    it('is_currently_running=false for draft promo', async () => {
      const draftPromo = makePromo({ status: 'draft' });
      const { service, promoRepo } = await buildService();
      const qb = makeQb([draftPromo], 1);
      promoRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list(BIZ_ID, {});
      expect(result.data[0].is_currently_running).toBe(false);
    });
  });

  describe('activate', () => {
    it('sets status to active', async () => {
      const promo = makePromo({ status: 'draft' });
      const { service, promoRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(promo),
        save: jest.fn((e: any) => Promise.resolve(e)),
      });
      const result = await service.activate(PROMO_ID, BIZ_ID);
      expect(result.status).toBe('active');
    });

    it('rejects activating an archived promotion', async () => {
      const promo = makePromo({ status: 'archived' });
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(promo),
      });
      await expect(service.activate(PROMO_ID, BIZ_ID)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('pause', () => {
    it('sets status to paused', async () => {
      const promo = makePromo({ status: 'active' });
      const { service, promoRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(promo),
        save: jest.fn((e: any) => Promise.resolve(e)),
      });
      const result = await service.pause(PROMO_ID, BIZ_ID);
      expect(result.status).toBe('paused');
    });
  });

  describe('archive', () => {
    it('sets status to archived', async () => {
      const promo = makePromo({ status: 'active' });
      const { service, promoRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(promo),
        save: jest.fn((e: any) => Promise.resolve(e)),
      });
      const result = await service.archive(PROMO_ID, BIZ_ID);
      expect(result.status).toBe('archived');
    });

    it('rejects archiving an already archived promotion', async () => {
      const promo = makePromo({ status: 'archived' });
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(promo),
      });
      await expect(service.archive(PROMO_ID, BIZ_ID)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('update locked fields', () => {
    it('returns 422 with locked_fields when current_uses > 0', async () => {
      const promo = makePromo({ current_uses: 5 });
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(promo),
      });
      await expect(
        service.update(PROMO_ID, BIZ_ID, { value: 20, promotion_type: 'fixed_off_order' } as any),
      ).rejects.toMatchObject({
        status: 422,
        response: expect.objectContaining({ locked_fields: expect.arrayContaining(['value', 'promotion_type']) }),
      });
    });

    it('allows updating non-locked fields when current_uses > 0', async () => {
      const promo = makePromo({ current_uses: 5 });
      const { service, promoRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(promo),
        save: jest.fn((e: any) => Promise.resolve(e)),
      });
      const result = await service.update(PROMO_ID, BIZ_ID, { notify_sms: true } as any);
      expect(promoRepo.save).toHaveBeenCalled();
    });
  });

  describe('cross-tenant', () => {
    it('returns 404 for promo in different business', async () => {
      const { service } = await buildService({
        findOne: jest.fn().mockResolvedValue(null),
      });
      await expect(service.getDetail(PROMO_ID, 'other-biz')).rejects.toThrow(NotFoundException);
    });
  });
});
