import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';
import { TradeCategory } from '../../common/entities/trade-category.entity';
import { Courier } from '../../common/entities/courier.entity';
import { BusinessCourierLink } from '../../common/entities/business-courier-link.entity';
import { BusinessCustomAuthority } from '../../common/entities/business-custom-authority.entity';
import { VersionLogMenu } from '../../common/entities/version-log-menu.entity';
import { VersionLogEntry } from '../../common/entities/version-log-entry.entity';
import { SystemParameter } from '../../common/entities/system-parameter.entity';
import { MoroccoRegion } from '../../common/entities/morocco-region.entity';
import { Business } from '../../common/entities/business.entity';

const BIZ = 'biz-1';

function makeBusiness(id = BIZ): Partial<Business> {
  return { id, daily_settlement_cutoff_time: '02:00' } as any;
}

describe('PlatformAdminService', () => {
  let service: PlatformAdminService;
  let tradeCategoryRepo: jest.Mocked<any>;
  let courierRepo: jest.Mocked<any>;
  let courierLinkRepo: jest.Mocked<any>;
  let customAuthorityRepo: jest.Mocked<any>;
  let versionMenuRepo: jest.Mocked<any>;
  let versionEntryRepo: jest.Mocked<any>;
  let systemParamRepo: jest.Mocked<any>;
  let regionRepo: jest.Mocked<any>;
  let businessRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const makeRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    });

    tradeCategoryRepo = makeRepo();
    courierRepo = makeRepo();
    courierLinkRepo = makeRepo();
    customAuthorityRepo = makeRepo();
    versionMenuRepo = makeRepo();
    versionEntryRepo = makeRepo();
    systemParamRepo = makeRepo();
    regionRepo = makeRepo();
    businessRepo = makeRepo();

    const module = await Test.createTestingModule({
      providers: [
        PlatformAdminService,
        { provide: getRepositoryToken(TradeCategory), useValue: tradeCategoryRepo },
        { provide: getRepositoryToken(Courier), useValue: courierRepo },
        { provide: getRepositoryToken(BusinessCourierLink), useValue: courierLinkRepo },
        { provide: getRepositoryToken(BusinessCustomAuthority), useValue: customAuthorityRepo },
        { provide: getRepositoryToken(VersionLogMenu), useValue: versionMenuRepo },
        { provide: getRepositoryToken(VersionLogEntry), useValue: versionEntryRepo },
        { provide: getRepositoryToken(SystemParameter), useValue: systemParamRepo },
        { provide: getRepositoryToken(MoroccoRegion), useValue: regionRepo },
        { provide: getRepositoryToken(Business), useValue: businessRepo },
      ],
    }).compile();

    service = module.get(PlatformAdminService);
  });

  // ── ADM-001: Trade category tree ─────────────────────────────────────────
  describe('listTradeCategoryTree', () => {
    it('returns only root-level active categories with children', async () => {
      const child = { id: 'c-2', parent_id: 'c-1', name: 'Café', code: 'CAFE', children: [], is_active: true, sort_order: 1 };
      const root = { id: 'c-1', parent_id: null, name: 'Food Service', code: 'FOOD', children: [child], is_active: true, sort_order: 0 };
      tradeCategoryRepo.find.mockResolvedValue([root]);
      const result = await service.listTradeCategoryTree();
      expect(result).toEqual([root]);
      expect(tradeCategoryRepo.find).toHaveBeenCalledWith({
        where: { parent_id: null, is_active: true },
        relations: ['children', 'children.children'],
        order: { sort_order: 'ASC' },
      });
    });
  });

  // ── ADM-002: Create trade category ───────────────────────────────────────
  describe('createTradeCategory', () => {
    it('creates and returns a new category', async () => {
      const dto = { name: 'Restaurant', code: 'REST' };
      const created = { id: 'new-id', ...dto, parent_id: null, is_active: true, sort_order: 0 };
      tradeCategoryRepo.create.mockReturnValue(created);
      tradeCategoryRepo.save.mockResolvedValue(created);
      const result = await service.createTradeCategory(dto as any);
      expect(result).toEqual(created);
    });
  });

  // ── ADM-003: Update trade category ───────────────────────────────────────
  describe('updateTradeCategory', () => {
    it('throws 404 when category not found', async () => {
      tradeCategoryRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTradeCategory('not-found', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('saves updated category', async () => {
      const existing = { id: 'c-1', name: 'Old', code: 'OLD', is_active: true };
      tradeCategoryRepo.findOne.mockResolvedValue(existing);
      tradeCategoryRepo.save.mockResolvedValue({ ...existing, name: 'New' });
      const result = await service.updateTradeCategory('c-1', { name: 'New' });
      expect(result.name).toBe('New');
    });
  });

  // ── ADM-005: Trade category options ──────────────────────────────────────
  describe('getTradeCategoryOptions', () => {
    it('returns flattened list with full path names', async () => {
      const child = { id: 'c-2', parent_id: 'c-1', name: 'Café', code: 'CAFE', children: [], is_active: true, sort_order: 0 };
      const root = { id: 'c-1', parent_id: null, name: 'Food Service', code: 'FOOD', children: [child], is_active: true, sort_order: 0 };
      tradeCategoryRepo.find.mockResolvedValue([root]);
      const result = await service.getTradeCategoryOptions();
      expect(result).toHaveLength(2);
      const paths = result.map((r: any) => r.full_path);
      expect(paths).toContain('Food Service');
      expect(paths).toContain('Food Service > Café');
    });
  });

  // ── ADM-010: List couriers ────────────────────────────────────────────────
  describe('listCouriers', () => {
    it('returns all couriers', async () => {
      const couriers = [{ id: 'courier-1', name: 'Glovo', code: 'GLOVO', is_active: true }];
      courierRepo.find.mockResolvedValue(couriers);
      const result = await service.listCouriers();
      expect(result).toEqual(couriers);
    });
  });

  // ── ADM-015: Link courier to business ────────────────────────────────────
  describe('linkCourierToBusiness', () => {
    it('throws 404 when courier not found', async () => {
      courierRepo.findOne.mockResolvedValue(null);
      await expect(service.linkCourierToBusiness(BIZ, { courier_id: 'x' } as any)).rejects.toThrow(NotFoundException);
    });

    it('saves the link', async () => {
      const courier = { id: 'courier-1', name: 'Glovo' };
      const link = { business_id: BIZ, courier_id: 'courier-1', is_default: false };
      courierRepo.findOne.mockResolvedValue(courier);
      courierLinkRepo.create.mockReturnValue(link);
      courierLinkRepo.save.mockResolvedValue(link);
      const result = await service.linkCourierToBusiness(BIZ, { courier_id: 'courier-1' } as any);
      expect(result).toEqual(link);
    });
  });

  // ── ADM-016: Unlink courier ───────────────────────────────────────────────
  describe('unlinkCourierFromBusiness', () => {
    it('throws 404 when link not found', async () => {
      courierLinkRepo.findOne.mockResolvedValue(null);
      await expect(service.unlinkCourierFromBusiness(BIZ, 'c-1')).rejects.toThrow(NotFoundException);
    });

    it('deletes the link', async () => {
      courierLinkRepo.findOne.mockResolvedValue({ business_id: BIZ, courier_id: 'c-1' });
      courierLinkRepo.delete.mockResolvedValue({ affected: 1 });
      await service.unlinkCourierFromBusiness(BIZ, 'c-1');
      expect(courierLinkRepo.delete).toHaveBeenCalledWith({ business_id: BIZ, courier_id: 'c-1' });
    });
  });

  // ── ADM-020/021: Custom authority ─────────────────────────────────────────
  describe('getBusinessCustomAuthority', () => {
    it('returns default shape when no override exists', async () => {
      customAuthorityRepo.findOne.mockResolvedValue(null);
      const result = await service.getBusinessCustomAuthority('biz-1');
      expect(result).toEqual({ business_id: 'biz-1', feature_overrides_json: {}, permission_overrides_json: {} });
    });
  });

  describe('setBusinessCustomAuthority', () => {
    it('creates override when none exists', async () => {
      customAuthorityRepo.findOne.mockResolvedValue(null);
      const saved = { business_id: BIZ, feature_overrides_json: { advanced_reports: true }, permission_overrides_json: {}, notes: null };
      customAuthorityRepo.create.mockReturnValue(saved);
      customAuthorityRepo.save.mockResolvedValue(saved);
      const result = await service.setBusinessCustomAuthority(BIZ, 'admin-id', { feature_overrides: { advanced_reports: true } });
      expect(result.feature_overrides_json).toEqual({ advanced_reports: true });
    });
  });

  // ── ADM-022: Effective permissions ────────────────────────────────────────
  describe('resolveEffectiveFeatures', () => {
    it('overlays custom authority on top of base features', async () => {
      const baseFeatures = [
        { feature_key: 'inventory', is_enabled: true },
        { feature_key: 'recommendations', is_enabled: false },
      ];
      customAuthorityRepo.findOne.mockResolvedValue({
        feature_overrides_json: { recommendations: true },
      });
      const result = await service.resolveEffectiveFeatures('biz-1', baseFeatures as any);
      expect(result['inventory']).toBe(true);
      expect(result['recommendations']).toBe(true);
    });
  });

  // ── ADM-040: Version log menus ────────────────────────────────────────────
  describe('listVersionLogMenus', () => {
    it('returns all menus ordered by sort_order', async () => {
      const menus = [{ id: 'm-1', name: 'Backend', sort_order: 1 }];
      versionMenuRepo.find.mockResolvedValue(menus);
      const result = await service.listVersionLogMenus();
      expect(result).toEqual(menus);
    });
  });

  // ── ADM-042: Create version log entry ────────────────────────────────────
  describe('createVersionLogEntry', () => {
    it('creates and returns an entry', async () => {
      const dto = { menu_id: 'm-1', version: '1.5.0', description: 'New feature' };
      const entry = { id: 'e-1', ...dto };
      versionEntryRepo.create.mockReturnValue(entry);
      versionEntryRepo.save.mockResolvedValue(entry);
      const result = await service.createVersionLogEntry(dto as any);
      expect(result.version).toBe('1.5.0');
    });
  });

  // ── ADM-041: List version log entries (auto-filters expired) ─────────────
  describe('listVersionLogEntries', () => {
    it('returns paginated entries excluding expired ones', async () => {
      const active = { id: 'e-1', version: '1.0', expires_at: null };
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[active], 1]),
      };
      versionEntryRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.listVersionLogEntries({});
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('e-1');
    });
  });

  // ── ADM-050: System parameters ───────────────────────────────────────────
  describe('listSystemParameters', () => {
    it('returns paginated system parameters', async () => {
      systemParamRepo.findAndCount.mockResolvedValue([[{ id: 'p-1', key: 'default_tva_rate', value: '20' }], 1]);
      const result = await service.listSystemParameters({});
      expect(result.data).toHaveLength(1);
    });
  });

  // ── ADM-051: Update system parameter ─────────────────────────────────────
  describe('updateSystemParameter', () => {
    it('throws 404 when param not found', async () => {
      systemParamRepo.findOne.mockResolvedValue(null);
      await expect(service.updateSystemParameter('p-not-found', { value: '15' })).rejects.toThrow(NotFoundException);
    });

    it('saves updated value', async () => {
      const param = { id: 'p-1', key: 'default_tva_rate', value: '20' };
      systemParamRepo.findOne.mockResolvedValue(param);
      systemParamRepo.save.mockResolvedValue({ ...param, value: '14' });
      const result = await service.updateSystemParameter('p-1', { value: '14' });
      expect(result.value).toBe('14');
    });
  });

  // ── ADM-060/061: Settlement cutoff ───────────────────────────────────────
  describe('getSettlementCutoff', () => {
    it('returns current cutoff for the business', async () => {
      businessRepo.findOne.mockResolvedValue(makeBusiness());
      const result = await service.getSettlementCutoff(BIZ);
      expect(result.cutoff_time).toBe('02:00');
    });

    it('throws 404 for unknown business', async () => {
      businessRepo.findOne.mockResolvedValue(null);
      await expect(service.getSettlementCutoff('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettlementCutoff', () => {
    it('saves and returns new cutoff', async () => {
      const biz = makeBusiness();
      businessRepo.findOne.mockResolvedValue(biz);
      businessRepo.save.mockResolvedValue({ ...biz, daily_settlement_cutoff_time: '03:00' });
      const result = await service.updateSettlementCutoff(BIZ, { cutoff_time: '03:00' });
      expect(result.cutoff_time).toBe('03:00');
    });
  });

  // ── ADM-070: Morocco regions tree ─────────────────────────────────────────
  describe('getMoroccoRegionsTree', () => {
    it('returns top-level regions with children', async () => {
      const regions = [{ id: 'mr-r-06', name: 'Casablanca-Settat', code: 'CST', level: 'region', parent_id: null, children: [] }];
      regionRepo.find.mockResolvedValue(regions);
      const result = await service.getMoroccoRegionsTree();
      expect(result).toEqual(regions);
    });
  });

  // ── ADM-071: Validate address ─────────────────────────────────────────────
  describe('validateAddress', () => {
    it('returns valid: true with full_path when all codes match', async () => {
      regionRepo.findOne
        .mockResolvedValueOnce({ id: 'mr-r-06', name: 'Casablanca-Settat', code: 'CST', level: 'region', parent_id: null })
        .mockResolvedValueOnce({ id: 'mr-p-051', name: 'Casablanca', code: 'CAS', level: 'prefecture', parent_id: 'mr-r-06' })
        .mockResolvedValueOnce({ id: 'mr-c-0010', name: 'Sidi Bernoussi', code: 'CAS-SBR', level: 'commune', parent_id: 'mr-p-051' });
      const result = await service.validateAddress({ region_code: 'CST', prefecture_code: 'CAS', commune_code: 'CAS-SBR' });
      expect(result.valid).toBe(true);
      expect(result.full_path).toBe('Casablanca-Settat / Casablanca / Sidi Bernoussi');
    });

    it('returns valid: false when region code is unknown', async () => {
      regionRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.validateAddress({ region_code: 'INVALID' });
      expect(result.valid).toBe(false);
    });
  });
});
