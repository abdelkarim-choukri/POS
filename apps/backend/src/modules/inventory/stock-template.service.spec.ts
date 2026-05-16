import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockTemplateService } from './stock-template.service';
import { StockTemplate } from '../../common/entities/stock-template.entity';
import { StockTemplateItem } from '../../common/entities/stock-template-item.entity';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../common/entities/purchase-order-item.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const TMPL_ID = 'tmpl-1';
const USER_ID = 'user-1';

function makeTemplate(overrides: Partial<StockTemplate> = {}): StockTemplate {
  return {
    id: TMPL_ID,
    business_id: BIZ,
    name: 'Weekly Order',
    default_vendor_id: null,
    default_warehouse_id: null,
    is_active: true,
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as StockTemplate;
}

describe('StockTemplateService', () => {
  let service: StockTemplateService;
  let templateRepo: jest.Mocked<any>;
  let itemRepo: jest.Mocked<any>;
  let poRepo: jest.Mocked<any>;
  let poItemRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  const mockQr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    },
  };

  beforeEach(async () => {
    templateRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    itemRepo = {};
    poRepo = { findOne: jest.fn() };
    poItemRepo = {};
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQr),
      query: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        StockTemplateService,
        { provide: getRepositoryToken(StockTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(StockTemplateItem), useValue: itemRepo },
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: getRepositoryToken(PurchaseOrderItem), useValue: poItemRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(StockTemplateService);

    Object.values(mockQr).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  // ── INV-060: List Templates ───────────────────────────────────────────────

  describe('listTemplates', () => {
    it('returns templates for the business', async () => {
      templateRepo.find.mockResolvedValue([makeTemplate()]);
      const result = await service.listTemplates(BIZ);
      expect(result.records).toHaveLength(1);
      expect(templateRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { business_id: BIZ } }));
    });
  });

  // ── INV-061: Get Template ─────────────────────────────────────────────────

  describe('getTemplate', () => {
    it('returns template by id', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate());
      const result = await service.getTemplate(TMPL_ID, BIZ);
      expect(result.id).toBe(TMPL_ID);
    });

    it('throws 404 for cross-tenant access', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.getTemplate(TMPL_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-062: Create Template ──────────────────────────────────────────────

  describe('createTemplate', () => {
    it('creates template with items atomically', async () => {
      const saved = makeTemplate();
      mockQr.manager.create.mockReturnValueOnce({}).mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(saved).mockResolvedValue([]);
      templateRepo.findOne.mockResolvedValue(saved);

      const result = await service.createTemplate(BIZ, {
        name: 'Weekly Order',
        items: [{ product_id: 'p-1', default_quantity: 10 }],
      });

      expect(result).toEqual(saved);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
    });

    it('rolls back and rethrows on error', async () => {
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createTemplate(BIZ, { name: 'X', items: [] }),
      ).rejects.toThrow('DB error');
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ── INV-063: Update Template ──────────────────────────────────────────────

  describe('updateTemplate', () => {
    it('updates name without touching items', async () => {
      const tmpl = makeTemplate();
      templateRepo.findOne.mockResolvedValueOnce(tmpl).mockResolvedValueOnce({ ...tmpl, name: 'New Name' });
      templateRepo.save.mockResolvedValue({ ...tmpl, name: 'New Name' });

      const result = await service.updateTemplate(TMPL_ID, BIZ, { name: 'New Name' });
      expect(templateRepo.save).toHaveBeenCalled();
      expect(result?.name).toBe('New Name');
    });

    it('replaces items atomically when items provided', async () => {
      const tmpl = makeTemplate({ items: [{ id: 'item-1' } as any] });
      templateRepo.findOne.mockResolvedValueOnce(tmpl).mockResolvedValueOnce(tmpl);
      mockQr.manager.save.mockResolvedValue({});
      mockQr.manager.remove.mockResolvedValue(undefined);
      mockQr.manager.create.mockReturnValue({});

      await service.updateTemplate(TMPL_ID, BIZ, {
        items: [{ product_id: 'p-new', default_quantity: 5 }],
      });

      expect(mockQr.manager.remove).toHaveBeenCalled();
      expect(mockQr.commitTransaction).toHaveBeenCalled();
    });

    it('throws 404 for cross-tenant access', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTemplate(TMPL_ID, OTHER_BIZ, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-064: Delete Template ──────────────────────────────────────────────

  describe('deleteTemplate', () => {
    it('deletes the template', async () => {
      const tmpl = makeTemplate();
      templateRepo.findOne.mockResolvedValue(tmpl);
      templateRepo.remove.mockResolvedValue(undefined);

      await service.deleteTemplate(TMPL_ID, BIZ);
      expect(templateRepo.remove).toHaveBeenCalledWith(tmpl);
    });

    it('throws 404 for cross-tenant access', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteTemplate(TMPL_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-065: Generate PO from Template ───────────────────────────────────

  describe('generatePurchaseOrder', () => {
    it('generates a draft PO from the template', async () => {
      const tmpl = makeTemplate({
        items: [{ product_id: 'p-1', variant_id: null, default_quantity: 20 } as any],
      });
      templateRepo.findOne.mockResolvedValue(tmpl);
      dataSource.query.mockResolvedValue([{ cnt: 3 }]);
      const savedPo = { id: 'po-1', po_number: 'PO-2026-0004' };
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(savedPo).mockResolvedValue([]);
      poRepo.findOne.mockResolvedValue(savedPo);

      const result = await service.generatePurchaseOrder(TMPL_ID, BIZ, USER_ID, {
        warehouse_id: 'wh-1',
      });

      expect(result).toEqual(savedPo);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
    });

    it('throws 404 if template not found', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(
        service.generatePurchaseOrder(TMPL_ID, OTHER_BIZ, USER_ID, { warehouse_id: 'wh-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
