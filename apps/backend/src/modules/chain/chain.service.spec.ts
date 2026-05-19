import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { ChainService, CHAIN_SYNC_QUEUE } from './chain.service';
import { Business } from '../../common/entities/business.entity';
import { User } from '../../common/entities/user.entity';
import { UserBusinessRole } from '../../common/entities/user-business-role.entity';
import { ChainSyncConfig } from '../../common/entities/chain-sync-config.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
// Category and Product imports kept for test provider setup only

const BIZ = 'biz-parent';
const CHILD_BIZ = 'biz-child';
const USER_ID = 'user-1';

function makeBiz(overrides: any = {}): Business {
  return {
    id: BIZ, name: 'HQ', chain_role: 'standalone',
    parent_business_id: null, is_active: true,
    ...overrides,
  } as Business;
}

describe('ChainService', () => {
  let service: ChainService;
  let bizRepo: jest.Mocked<any>;
  let userRepo: jest.Mocked<any>;
  let ubrRepo: jest.Mocked<any>;
  let syncConfigRepo: jest.Mocked<any>;
  let auditLogRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;
  let jwtService: jest.Mocked<any>;

  const mockQr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    bizRepo = { findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn(), save: jest.fn() };
    ubrRepo = { find: jest.fn(), save: jest.fn(), delete: jest.fn(), upsert: jest.fn() };
    syncConfigRepo = { findOne: jest.fn(), save: jest.fn(), upsert: jest.fn() };
    auditLogRepo = { create: jest.fn((dto) => ({ ...dto })), save: jest.fn().mockResolvedValue(undefined) };
    dataSource = { query: jest.fn(), createQueryRunner: jest.fn().mockReturnValue(mockQr) };
    jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

    const module = await Test.createTestingModule({
      providers: [
        ChainService,
        { provide: getRepositoryToken(Business), useValue: bizRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserBusinessRole), useValue: ubrRepo },
        { provide: getRepositoryToken(ChainSyncConfig), useValue: syncConfigRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
        { provide: getRepositoryToken(Category), useValue: { findBy: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(Product), useValue: { findBy: jest.fn().mockResolvedValue([]) } },
        { provide: DataSource, useValue: dataSource },
        { provide: JwtService, useValue: jwtService },
        { provide: getQueueToken(CHAIN_SYNC_QUEUE), useValue: { add: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(ChainService);

    Object.values(mockQr).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  // ── CHN-001: Chain tree ───────────────────────────────────────────────────
  describe('getChainTree', () => {
    it('returns parent businesses with children', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          { id: BIZ, name: 'HQ', chain_role: 'parent', is_active: true, location_count: '2' },
        ])
        .mockResolvedValueOnce([
          { id: CHILD_BIZ, name: 'Branch', chain_role: 'child', is_active: true, location_count: '1' },
        ]);
      const result = await service.getChainTree();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].children).toHaveLength(1);
    });
  });

  // ── CHN-002: Promote to parent ────────────────────────────────────────────
  describe('promoteToParent', () => {
    it('sets chain_role to parent', async () => {
      bizRepo.findOne.mockResolvedValue(makeBiz({ chain_role: 'standalone' }));
      bizRepo.save.mockResolvedValue(makeBiz({ chain_role: 'parent' }));
      await service.promoteToParent(BIZ);
      expect(bizRepo.save).toHaveBeenCalledWith(expect.objectContaining({ chain_role: 'parent' }));
    });

    it('throws 404 for unknown business', async () => {
      bizRepo.findOne.mockResolvedValue(null);
      await expect(service.promoteToParent('no-such')).rejects.toThrow(NotFoundException);
    });

    it('throws 422 if already a child', async () => {
      bizRepo.findOne.mockResolvedValue(makeBiz({ chain_role: 'child' }));
      await expect(service.promoteToParent(BIZ)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── CHN-003: Link child ───────────────────────────────────────────────────
  describe('linkChild', () => {
    it('sets child.parent_business_id and chain_role=child', async () => {
      const parent = makeBiz({ chain_role: 'parent' });
      const child = makeBiz({ id: CHILD_BIZ, chain_role: 'standalone' });
      bizRepo.findOne
        .mockResolvedValueOnce(child)
        .mockResolvedValueOnce(parent);
      bizRepo.save.mockResolvedValue({ ...child, parent_business_id: BIZ, chain_role: 'child' });
      await service.linkChild(CHILD_BIZ, BIZ);
      expect(bizRepo.save).toHaveBeenCalledWith(expect.objectContaining({ parent_business_id: BIZ, chain_role: 'child' }));
    });

    it('throws 422 if parent is not promoted', async () => {
      const child = makeBiz({ id: CHILD_BIZ, chain_role: 'standalone' });
      const parent = makeBiz({ chain_role: 'standalone' });
      bizRepo.findOne.mockResolvedValueOnce(child).mockResolvedValueOnce(parent);
      await expect(service.linkChild(CHILD_BIZ, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 to prevent cycle (child_id === parent_id)', async () => {
      await expect(service.linkChild(BIZ, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── CHN-004: Unlink child ─────────────────────────────────────────────────
  describe('unlinkChild', () => {
    it('resets child to standalone', async () => {
      bizRepo.findOne.mockResolvedValue(makeBiz({ id: CHILD_BIZ, chain_role: 'child', parent_business_id: BIZ }));
      bizRepo.save.mockResolvedValue({ id: CHILD_BIZ, chain_role: 'standalone', parent_business_id: null });
      await service.unlinkChild(CHILD_BIZ);
      expect(bizRepo.save).toHaveBeenCalledWith(expect.objectContaining({ chain_role: 'standalone', parent_business_id: null }));
    });

    it('throws 404 if business not found', async () => {
      bizRepo.findOne.mockResolvedValue(null);
      await expect(service.unlinkChild('no-such')).rejects.toMatchObject({ response: { error: 'CHN_BUSINESS_NOT_FOUND' } });
    });
  });

  // ── CHN-010: Accessible businesses ───────────────────────────────────────
  describe('getAccessibleBusinesses', () => {
    it('returns list from user_business_roles', async () => {
      dataSource.query.mockResolvedValue([
        { business_id: BIZ, name: 'HQ', role: 'owner' },
        { business_id: CHILD_BIZ, name: 'Branch', role: 'manager' },
      ]);
      const result = await service.getAccessibleBusinesses(USER_ID);
      expect(result).toHaveLength(2);
    });
  });

  // ── CHN-011: Switch business ──────────────────────────────────────────────
  describe('switchBusiness', () => {
    it('returns new JWT for accessible business', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ has_access: true }])    // access check
        .mockResolvedValueOnce([{ role: 'manager' }]);    // role lookup
      const result = await service.switchBusiness(USER_ID, CHILD_BIZ, 'employee');
      expect(result.access_token).toBe('mock-token');
    });

    it('throws 403 if user has no access to target business', async () => {
      dataSource.query.mockResolvedValueOnce([{ has_access: false }]);
      await expect(service.switchBusiness(USER_ID, 'other-biz', 'employee')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── CHN-012: Grant business access ───────────────────────────────────────
  describe('grantBusinessAccess', () => {
    it('upserts user_business_roles and updates accessible_business_ids', async () => {
      const user = { id: 'user-2', accessible_business_ids: [] } as any;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);
      ubrRepo.upsert.mockResolvedValue(undefined);
      dataSource.query.mockResolvedValueOnce([{ cnt: 1 }]); // child-ownership check
      await service.grantBusinessAccess('user-2', BIZ, [CHILD_BIZ], { [CHILD_BIZ]: 'manager' });
      expect(ubrRepo.upsert).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        accessible_business_ids: expect.arrayContaining([CHILD_BIZ]),
      }));
    });

    it('throws 422 if a business is not a child of the granting chain', async () => {
      const user = { id: 'user-2', accessible_business_ids: [] } as any;
      userRepo.findOne.mockResolvedValue(user);
      dataSource.query.mockResolvedValueOnce([{ cnt: 0 }]); // fails ownership check
      await expect(
        service.grantBusinessAccess('user-2', BIZ, [CHILD_BIZ], { [CHILD_BIZ]: 'manager' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── CHN-020: Sync config ──────────────────────────────────────────────────
  describe('setSyncConfig', () => {
    it('upserts config for parent business', async () => {
      syncConfigRepo.upsert.mockResolvedValue(undefined);
      syncConfigRepo.findOne.mockResolvedValue({ parent_business_id: BIZ, sync_products: true });
      await service.setSyncConfig(BIZ, {
        sync_categories: true, sync_products: true, sync_variants: true,
        sync_modifiers: true, sync_prices: false, auto_sync_on_change: false,
        child_business_ids: [CHILD_BIZ],
      });
      expect(syncConfigRepo.upsert).toHaveBeenCalled();
    });
  });

  // ── CHN-022: Sync job status ──────────────────────────────────────────────
  describe('getSyncJobStatus', () => {
    it('throws 404 for job not found or cross-tenant', async () => {
      dataSource.query.mockResolvedValue([]);
      await expect(service.getSyncJobStatus('job-1', 'other-biz')).rejects.toThrow(NotFoundException);
    });
  });

  // ── CHN-023: Unmapped products ────────────────────────────────────────────
  describe('getUnmappedProducts', () => {
    it('throws 422 if business has no parent', async () => {
      bizRepo.findOne.mockResolvedValue(makeBiz({ chain_role: 'standalone', parent_business_id: null }));
      await expect(service.getUnmappedProducts(BIZ)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── CHN-030: Rollout promotion ────────────────────────────────────────────
  describe('rolloutPromotion', () => {
    it('copies promotion to each child with synced_from_parent_id', async () => {
      const promo = { id: 'promo-1', business_id: BIZ, name: 'Summer Sale', is_active: true };
      dataSource.query
        .mockResolvedValueOnce([promo])
        .mockResolvedValueOnce([])   // _getTvaMismatchWarnings
        .mockResolvedValueOnce([{ id: 'new-promo-id' }]);
      const result = await service.rolloutPromotion(BIZ, 'promo-1', [CHILD_BIZ], false);
      expect(dataSource.query).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('throws 404 if promotion not found or not owned by parent', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.rolloutPromotion(BIZ, 'no-promo', [CHILD_BIZ], false)).rejects.toThrow(NotFoundException);
    });
  });

  // ── CHN-040: Chain dashboard ──────────────────────────────────────────────
  describe('getChainDashboard', () => {
    it('returns per-child rollup with chain totals', async () => {
      dataSource.query.mockResolvedValue([
        { business_id: CHILD_BIZ, name: 'Branch', revenue: '5000', transaction_count: 50, customer_count: 30 },
      ]);
      const result = await service.getChainDashboard(BIZ, '2026-01-01', '2026-01-31');
      expect(result.children).toHaveLength(1);
      expect(result.totals).toBeDefined();
    });
  });

  // ── CHN-041: Chain transactions ───────────────────────────────────────────
  describe('getChainTransactions', () => {
    it('returns paginated transactions across child businesses', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ cnt: '10' }])
        .mockResolvedValueOnce([{ id: 'txn-1', business_id: CHILD_BIZ }]);
      const result = await service.getChainTransactions(BIZ, { page: 1, limit: 20 });
      expect(result.total).toBe(10);
    });
  });

  // ── CHN-050: Parent vendor info ───────────────────────────────────────────
  describe('getParentVendorInfo', () => {
    it('returns parent business info for child', async () => {
      const child = makeBiz({ id: CHILD_BIZ, parent_business_id: BIZ, chain_role: 'child' });
      const parent = makeBiz({ id: BIZ, chain_role: 'parent', name: 'HQ', ice_number: '001', if_number: '002' });
      bizRepo.findOne.mockResolvedValueOnce(child).mockResolvedValueOnce(parent);
      const result = await service.getParentVendorInfo(CHILD_BIZ);
      expect(result.parent_name).toBe('HQ');
    });

    it('throws 422 if child has no parent', async () => {
      bizRepo.findOne.mockResolvedValue(makeBiz({ chain_role: 'standalone', parent_business_id: null }));
      await expect(service.getParentVendorInfo(CHILD_BIZ)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── CHN-051: Incoming PO requests ─────────────────────────────────────────
  describe('getIncomingPoRequests', () => {
    it('returns POs from child businesses', async () => {
      dataSource.query.mockResolvedValue([
        { id: 'po-1', business_id: CHILD_BIZ, status: 'confirmed' },
      ]);
      const result = await service.getIncomingPoRequests(BIZ);
      expect(result).toHaveLength(1);
    });
  });

  // ── CHN-052: Fulfill child PO ─────────────────────────────────────────────
  describe('fulfillChildPo', () => {
    it('throws 404 if PO not found', async () => {
      dataSource.query.mockResolvedValue([]);
      await expect(
        service.fulfillChildPo(BIZ, 'no-po', 'wh-1', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('writes audit log on successful fulfillment', async () => {
      const po = {
        id: 'po-1',
        child_biz_id: CHILD_BIZ,
        status: 'confirmed',
      };
      // First query: PO lookup; second: PO items; subsequent: FIFO batches, movements, updates
      dataSource.query
        .mockResolvedValueOnce([po])        // PO lookup
        .mockResolvedValueOnce([])          // PO items (empty — nothing to FIFO)
        .mockResolvedValue(undefined);      // any remaining queries (UPDATE status)
      mockQr.query.mockResolvedValue([]);   // QR queries (batch SELECT FOR UPDATE, etc.)

      await service.fulfillChildPo(BIZ, 'po-1', 'wh-1', USER_ID);

      expect(auditLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'fulfill' }));
      expect(auditLogRepo.save).toHaveBeenCalled();
    });
  });
});
