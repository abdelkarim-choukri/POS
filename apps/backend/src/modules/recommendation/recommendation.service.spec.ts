import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RecommendationService } from './recommendation.service';
import { RecommendationTemplate } from '../../common/entities/recommendation-template.entity';
import { RecommendationTemplateItem } from '../../common/entities/recommendation-template-item.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-other';
const TMPL_ID = 'tmpl-1';

function makeTemplate(overrides: Partial<RecommendationTemplate> = {}): RecommendationTemplate {
  return {
    id: TMPL_ID,
    business_id: BIZ,
    name: 'Test Template',
    template_type: 'manual',
    time_window_start: null,
    time_window_end: null,
    applicable_days_of_week: null,
    target_grade_ids: null,
    min_recommendations: 3,
    max_recommendations: 10,
    whole_price_tier: null,
    applicable_location_ids: null,
    is_active: true,
    display_order: 0,
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
    business: {} as any,
    ...overrides,
  };
}

describe('RecommendationService', () => {
  let service: RecommendationService;
  let templateRepo: jest.Mocked<any>;
  let itemRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  beforeEach(async () => {
    templateRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    itemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    dataSource = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: getRepositoryToken(RecommendationTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(RecommendationTemplateItem), useValue: itemRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(RecommendationService);
  });

  // ── REC-001: List templates ──────────────────────────────────────────────
  describe('listTemplates', () => {
    it('returns templates scoped to the business', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeTemplate()]),
      };
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listTemplates(BIZ, {});
      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith('t.business_id = :businessId', { businessId: BIZ });
    });

    it('applies for_terminal_now filter (3 extra andWhere calls)', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.listTemplates(BIZ, { for_terminal_now: true });
      // is_active=true + time window + day-of-week
      expect(qb.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  // ── REC-002: Create template ─────────────────────────────────────────────
  describe('createTemplate', () => {
    it('creates and returns a template with defaults', async () => {
      const dto = { name: 'Lunch Specials', template_type: 'manual' };
      const created = makeTemplate({ name: 'Lunch Specials' });
      templateRepo.create.mockReturnValue(created);
      templateRepo.save.mockResolvedValue(created);

      const result = await service.createTemplate(BIZ, dto as any);
      expect(result.name).toBe('Lunch Specials');
      expect(templateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ business_id: BIZ, min_recommendations: 3, max_recommendations: 10 }),
      );
    });
  });

  // ── REC-003: Update template ─────────────────────────────────────────────
  describe('updateTemplate', () => {
    it('updates and returns the template', async () => {
      const tmpl = makeTemplate();
      templateRepo.findOne.mockResolvedValue(tmpl);
      templateRepo.save.mockResolvedValue({ ...tmpl, name: 'Updated' });

      const result = await service.updateTemplate(TMPL_ID, BIZ, { name: 'Updated' } as any);
      expect(result.name).toBe('Updated');
    });

    it('throws 404 for cross-tenant access (REC-003)', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTemplate(TMPL_ID, OTHER_BIZ, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── REC-004: Delete template ─────────────────────────────────────────────
  describe('deleteTemplate', () => {
    it('removes the template and returns { deleted: true }', async () => {
      const tmpl = makeTemplate();
      templateRepo.findOne.mockResolvedValue(tmpl);
      templateRepo.remove.mockResolvedValue(undefined);

      expect(await service.deleteTemplate(TMPL_ID, BIZ)).toEqual({ deleted: true });
    });

    it('throws 404 for cross-tenant access (REC-004)', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteTemplate(TMPL_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  // ── REC-005: Set template items ──────────────────────────────────────────
  describe('setTemplateItems', () => {
    it('replaces all items for a manual template', async () => {
      const tmpl = makeTemplate({ template_type: 'manual' });
      templateRepo.findOne.mockResolvedValue(tmpl);
      itemRepo.delete.mockResolvedValue(undefined);
      itemRepo.create.mockImplementation((data: any) => data);
      itemRepo.save.mockResolvedValue([{ product_id: 'prod-1', priority: 0, is_active: true }]);

      const dto = { items: [{ product_id: 'prod-1', priority: 0 }] };
      await service.setTemplateItems(TMPL_ID, BIZ, dto as any);
      expect(itemRepo.delete).toHaveBeenCalledWith({ template_id: TMPL_ID });
      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('throws 422 for non-manual templates', async () => {
      const tmpl = makeTemplate({ template_type: 'top_seller' });
      templateRepo.findOne.mockResolvedValue(tmpl);

      await expect(
        service.setTemplateItems(TMPL_ID, BIZ, { items: [] } as any),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── REC-010: Resolve template ────────────────────────────────────────────
  describe('resolveTemplate', () => {
    it('throws 404 for cross-tenant access', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.resolveTemplate(TMPL_ID, OTHER_BIZ, {})).rejects.toThrow(NotFoundException);
    });

    it('returns manual items with parsed price', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({ template_type: 'manual', whole_price_tier: null }));
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', variant_id: null, name: 'Burger', price: '25.00', image_url: null, priority: 0 },
      ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, {});
      expect(result.items).toHaveLength(1);
      expect(result.items[0].price).toBe(25);
      expect(result.template_type).toBe('manual');
    });

    it('executes top-seller SQL for top_seller template', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({ template_type: 'top_seller', max_recommendations: 5 }));
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', name: 'Burger', price: '25.00', image_url: null, sale_count: 10 },
      ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, {});
      expect(result.template_type).toBe('top_seller');
      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(ti.id)'), [BIZ, 5]);
    });

    it('executes high-margin SQL for high_margin template', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({ template_type: 'high_margin', max_recommendations: 5 }));
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', name: 'Caviar', price: '200.00', image_url: null },
      ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, {});
      expect(result.template_type).toBe('high_margin');
      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('cost_price'), [BIZ, 5]);
    });

    it('returns empty items for time_of_day template outside window', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({
        template_type: 'time_of_day',
        time_window_start: '12:00',
        time_window_end: '14:00',
        applicable_days_of_week: null,
      }));

      const result = await service.resolveTemplate(TMPL_ID, BIZ, { current_time: '09:00' });
      expect(result.items).toHaveLength(0);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('returns items for time_of_day template inside window', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({
        template_type: 'time_of_day',
        time_window_start: '12:00',
        time_window_end: '14:00',
        applicable_days_of_week: null,
        whole_price_tier: null,
      }));
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', variant_id: null, name: 'Lunch', price: '30.00', image_url: null, priority: 0 },
      ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, { current_time: '13:00' });
      expect(result.items).toHaveLength(1);
    });

    it('returns empty for customer_grade_targeted without customer_id', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({
        template_type: 'customer_grade_targeted',
        target_grade_ids: ['grade-vip'],
      }));

      const result = await service.resolveTemplate(TMPL_ID, BIZ, {});
      expect(result.items).toHaveLength(0);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('returns items for customer_grade_targeted with matching grade', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({
        template_type: 'customer_grade_targeted',
        target_grade_ids: ['grade-vip'],
        whole_price_tier: null,
      }));
      dataSource.query
        .mockResolvedValueOnce([{ grade_id: 'grade-vip' }])
        .mockResolvedValueOnce([
          { product_id: 'p1', variant_id: null, name: 'VIP Item', price: '100.00', image_url: null, priority: 0 },
        ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, { customer_id: 'cust-1' });
      expect(result.items).toHaveLength(1);
      expect(dataSource.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM customers'),
        ['cust-1', BIZ],
      );
    });
  });

  // ── REC-020: Featured items ──────────────────────────────────────────────
  describe('getFeaturedItems', () => {
    it('returns flattened items from all active templates', async () => {
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', template_name: 'T1', name: 'Burger', price: '25.00', image_url: null, priority: 0, display_order: 0 },
      ]);

      const result = await service.getFeaturedItems(BIZ);
      expect(result).toHaveLength(1);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('recommendation_templates'),
        [BIZ],
      );
    });
  });
});
