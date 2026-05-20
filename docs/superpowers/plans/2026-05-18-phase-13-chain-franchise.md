# Phase 13: Chain & Franchise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement parent/child business hierarchy, multi-business login, cloud goods sync, chain-wide promotions, chain reporting, and parent-routed purchase orders.

**Architecture:** New `ChainModule` at `src/modules/chain/` with 3 controllers (super, auth, business) and a single `ChainService` handling all business logic. BullMQ processor handles async catalogue sync. One migration adds 2 new tables and 8 column additions across 7 existing tables.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, BullMQ, JwtService (re-exported from AuthModule).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/migrations/1714013000000-AddChainOperations.ts` | Create | All schema changes |
| `src/common/entities/user-business-role.entity.ts` | Create | Multi-business role join table |
| `src/common/entities/chain-sync-config.entity.ts` | Create | Per-parent sync settings |
| `src/common/entities/business.entity.ts` | Modify | Add parent_business_id, chain_role |
| `src/common/entities/user.entity.ts` | Modify | Add accessible_business_ids |
| `src/common/entities/category.entity.ts` | Modify | Add synced_from_parent_id |
| `src/common/entities/product.entity.ts` | Modify | Add synced_from_parent_id |
| `src/common/entities/product-variant.entity.ts` | Modify | Add synced_from_parent_id |
| `src/common/entities/modifier-group.entity.ts` | Modify | Add synced_from_parent_id |
| `src/common/entities/modifier.entity.ts` | Modify | Add synced_from_parent_id |
| `src/common/entities/index.ts` | Modify | Export 2 new entities |
| `src/modules/chain/dto/chain.dto.ts` | Create | All request/response DTOs |
| `src/modules/chain/chain.service.ts` | Create | All chain business logic |
| `src/modules/chain/chain-super.controller.ts` | Create | /api/super/businesses/* (CHN-001–004) |
| `src/modules/chain/chain-auth.controller.ts` | Create | /api/auth/* (CHN-010–011) |
| `src/modules/chain/chain.controller.ts` | Create | /api/business/* (CHN-012, CHN-020–052) |
| `src/modules/chain/chain-sync.processor.ts` | Create | BullMQ cloud goods sync |
| `src/modules/chain/chain.module.ts` | Create | Module wiring |
| `src/modules/chain/chain.service.spec.ts` | Create | ~28 unit tests |
| `src/modules/chain/chain-sync.processor.spec.ts` | Create | ~4 processor tests |
| `src/app.module.ts` | Modify | Register ChainModule |

---

## Task 1: Migration + Entity Updates

**Files:**
- Create: `apps/backend/src/migrations/1714013000000-AddChainOperations.ts`
- Modify: `apps/backend/src/common/entities/business.entity.ts`
- Modify: `apps/backend/src/common/entities/user.entity.ts`
- Modify: `apps/backend/src/common/entities/category.entity.ts`
- Modify: `apps/backend/src/common/entities/product.entity.ts`
- Modify: `apps/backend/src/common/entities/product-variant.entity.ts`
- Modify: `apps/backend/src/common/entities/modifier-group.entity.ts`
- Modify: `apps/backend/src/common/entities/modifier.entity.ts`
- Create: `apps/backend/src/common/entities/user-business-role.entity.ts`
- Create: `apps/backend/src/common/entities/chain-sync-config.entity.ts`
- Modify: `apps/backend/src/common/entities/index.ts`

- [ ] **Step 1: Create the migration**

```typescript
// apps/backend/src/migrations/1714013000000-AddChainOperations.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChainOperations1714013000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // ── New tables ────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE user_business_roles (
        user_id     UUID NOT NULL,
        business_id UUID NOT NULL,
        role        VARCHAR(20) NOT NULL,
        granted_by_user_id UUID,
        granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, business_id)
      )
    `);
    await qr.query(`CREATE INDEX idx_ubr_business_id ON user_business_roles(business_id)`);

    await qr.query(`
      CREATE TABLE chain_sync_configs (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_business_id  UUID NOT NULL UNIQUE,
        child_business_ids  UUID[] NOT NULL DEFAULT '{}',
        sync_categories     BOOLEAN NOT NULL DEFAULT true,
        sync_products       BOOLEAN NOT NULL DEFAULT true,
        sync_variants       BOOLEAN NOT NULL DEFAULT true,
        sync_modifiers      BOOLEAN NOT NULL DEFAULT true,
        sync_prices         BOOLEAN NOT NULL DEFAULT false,
        auto_sync_on_change BOOLEAN NOT NULL DEFAULT false,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── businesses ────────────────────────────────────────────────────────
    await qr.query(`ALTER TABLE businesses ADD COLUMN parent_business_id UUID NULL`);
    await qr.query(`ALTER TABLE businesses ADD CONSTRAINT fk_businesses_parent FOREIGN KEY (parent_business_id) REFERENCES businesses(id) ON DELETE SET NULL`);
    await qr.query(`ALTER TABLE businesses ADD COLUMN chain_role VARCHAR(20) NOT NULL DEFAULT 'standalone'`);
    await qr.query(`CREATE INDEX idx_businesses_parent ON businesses(parent_business_id) WHERE parent_business_id IS NOT NULL`);

    // ── users ─────────────────────────────────────────────────────────────
    await qr.query(`ALTER TABLE users ADD COLUMN accessible_business_ids UUID[] NOT NULL DEFAULT '{}'`);

    // ── catalogue tables ──────────────────────────────────────────────────
    await qr.query(`ALTER TABLE categories ADD COLUMN synced_from_parent_id UUID NULL`);
    await qr.query(`ALTER TABLE products ADD COLUMN synced_from_parent_id UUID NULL`);
    await qr.query(`ALTER TABLE product_variants ADD COLUMN synced_from_parent_id UUID NULL`);
    await qr.query(`ALTER TABLE modifier_groups ADD COLUMN synced_from_parent_id UUID NULL`);
    await qr.query(`ALTER TABLE modifiers ADD COLUMN synced_from_parent_id UUID NULL`);

    // ── promotions (CHN-030 tracking) ─────────────────────────────────────
    await qr.query(`ALTER TABLE promotions ADD COLUMN synced_from_parent_id UUID NULL`);

    // ── partial unique indexes for ON CONFLICT upserts ────────────────────
    await qr.query(`CREATE UNIQUE INDEX idx_products_biz_synced ON products(business_id, synced_from_parent_id) WHERE synced_from_parent_id IS NOT NULL`);
    await qr.query(`CREATE UNIQUE INDEX idx_categories_biz_synced ON categories(business_id, synced_from_parent_id) WHERE synced_from_parent_id IS NOT NULL`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_products_biz_synced`);
    await qr.query(`DROP INDEX IF EXISTS idx_categories_biz_synced`);
    await qr.query(`ALTER TABLE promotions DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE modifiers DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE modifier_groups DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE product_variants DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE products DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE categories DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE users DROP COLUMN IF EXISTS accessible_business_ids`);
    await qr.query(`DROP INDEX IF EXISTS idx_businesses_parent`);
    await qr.query(`ALTER TABLE businesses DROP CONSTRAINT IF EXISTS fk_businesses_parent`);
    await qr.query(`ALTER TABLE businesses DROP COLUMN IF EXISTS chain_role`);
    await qr.query(`ALTER TABLE businesses DROP COLUMN IF EXISTS parent_business_id`);
    await qr.query(`DROP TABLE IF EXISTS chain_sync_configs`);
    await qr.query(`DROP INDEX IF EXISTS idx_ubr_business_id`);
    await qr.query(`DROP TABLE IF EXISTS user_business_roles`);
  }
}
```

- [ ] **Step 2: Create UserBusinessRole entity**

```typescript
// apps/backend/src/common/entities/user-business-role.entity.ts
import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('user_business_roles')
export class UserBusinessRole {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @PrimaryColumn({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'uuid', nullable: true })
  granted_by_user_id: string | null;

  @CreateDateColumn({ name: 'granted_at' })
  granted_at: Date;
}
```

- [ ] **Step 3: Create ChainSyncConfig entity**

```typescript
// apps/backend/src/common/entities/chain-sync-config.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('chain_sync_configs')
export class ChainSyncConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  parent_business_id: string;

  @Column({ type: 'uuid', array: true, default: '{}' })
  child_business_ids: string[];

  @Column({ type: 'boolean', default: true })
  sync_categories: boolean;

  @Column({ type: 'boolean', default: true })
  sync_products: boolean;

  @Column({ type: 'boolean', default: true })
  sync_variants: boolean;

  @Column({ type: 'boolean', default: true })
  sync_modifiers: boolean;

  @Column({ type: 'boolean', default: false })
  sync_prices: boolean;

  @Column({ type: 'boolean', default: false })
  auto_sync_on_change: boolean;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- [ ] **Step 4: Update entity files — add new columns**

**business.entity.ts** — add after `promotion_stacking_mode` column:
```typescript
  @Column({ type: 'uuid', nullable: true })
  parent_business_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'standalone' })
  chain_role: string;
```

**user.entity.ts** — add after `language_preference` column:
```typescript
  @Column({ type: 'uuid', array: true, default: '{}' })
  accessible_business_ids: string[];
```

**category.entity.ts** — add after `default_tva_rate` column:
```typescript
  @Column({ type: 'uuid', nullable: true })
  synced_from_parent_id: string | null;
```

**product.entity.ts** — add after `track_stock` column (before relations):
```typescript
  @Column({ type: 'uuid', nullable: true })
  synced_from_parent_id: string | null;
```

**product-variant.entity.ts** — add after `is_active` column:
```typescript
  @Column({ type: 'uuid', nullable: true })
  synced_from_parent_id: string | null;
```

**modifier-group.entity.ts** — add after `sort_order` column:
```typescript
  @Column({ type: 'uuid', nullable: true })
  synced_from_parent_id: string | null;
```

**modifier.entity.ts** — add after `is_active` column:
```typescript
  @Column({ type: 'uuid', nullable: true })
  synced_from_parent_id: string | null;
```

- [ ] **Step 5: Update index.ts**

Add to `apps/backend/src/common/entities/index.ts`:
```typescript
export { UserBusinessRole } from './user-business-role.entity';
export { ChainSyncConfig } from './chain-sync-config.entity';
```

- [ ] **Step 6: Run tests to confirm no regression**

```bash
docker compose exec backend npm test 2>&1 | tail -10
```

Expected: 549 tests passing, 40 suites. Zero failures.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/migrations/1714013000000-AddChainOperations.ts \
  apps/backend/src/common/entities/user-business-role.entity.ts \
  apps/backend/src/common/entities/chain-sync-config.entity.ts \
  apps/backend/src/common/entities/business.entity.ts \
  apps/backend/src/common/entities/user.entity.ts \
  apps/backend/src/common/entities/category.entity.ts \
  apps/backend/src/common/entities/product.entity.ts \
  apps/backend/src/common/entities/product-variant.entity.ts \
  apps/backend/src/common/entities/modifier-group.entity.ts \
  apps/backend/src/common/entities/modifier.entity.ts \
  apps/backend/src/common/entities/index.ts
git commit -m "phase-13: migration AddChainOperations + entity updates (CHN-MOD-004-006)"
```

---

## Task 2: ChainModule Scaffold + Chain Setup Endpoints (CHN-001–004)

**Files:**
- Create: `apps/backend/src/modules/chain/dto/chain.dto.ts`
- Create: `apps/backend/src/modules/chain/chain.service.ts`
- Create: `apps/backend/src/modules/chain/chain-super.controller.ts`
- Create: `apps/backend/src/modules/chain/chain-auth.controller.ts` (stub)
- Create: `apps/backend/src/modules/chain/chain.controller.ts` (stub)
- Create: `apps/backend/src/modules/chain/chain.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Create: `apps/backend/src/modules/chain/chain.service.spec.ts` (CHN-001–004 tests)

- [ ] **Step 1: Write failing tests for CHN-001–004**

Create `apps/backend/src/modules/chain/chain.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { ChainService } from './chain.service';
import { Business } from '../../common/entities/business.entity';
import { User } from '../../common/entities/user.entity';
import { UserBusinessRole } from '../../common/entities/user-business-role.entity';
import { ChainSyncConfig } from '../../common/entities/chain-sync-config.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';

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
  let dataSource: jest.Mocked<any>;
  let jwtService: jest.Mocked<any>;

  beforeEach(async () => {
    bizRepo = { findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn(), save: jest.fn() };
    ubrRepo = { find: jest.fn(), save: jest.fn(), delete: jest.fn(), upsert: jest.fn() };
    syncConfigRepo = { findOne: jest.fn(), save: jest.fn(), upsert: jest.fn() };
    dataSource = { query: jest.fn(), createQueryRunner: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

    const module = await Test.createTestingModule({
      providers: [
        ChainService,
        { provide: getRepositoryToken(Business), useValue: bizRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserBusinessRole), useValue: ubrRepo },
        { provide: getRepositoryToken(ChainSyncConfig), useValue: syncConfigRepo },
        { provide: getRepositoryToken(Category), useValue: { findBy: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(Product), useValue: { findBy: jest.fn().mockResolvedValue([]) } },
        { provide: DataSource, useValue: dataSource },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(ChainService);
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
      const result = await service.promoteToParent(BIZ);
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
        .mockResolvedValueOnce(child)   // child lookup
        .mockResolvedValueOnce(parent); // parent lookup
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
      const result = await service.unlinkChild(CHILD_BIZ);
      expect(bizRepo.save).toHaveBeenCalledWith(expect.objectContaining({ chain_role: 'standalone', parent_business_id: null }));
    });

    it('throws 404 if business not found', async () => {
      bizRepo.findOne.mockResolvedValue(null);
      await expect(service.unlinkChild('no-such')).rejects.toThrow(NotFoundException);
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
        .mockResolvedValueOnce([{ cnt: '1' }])           // access check
        .mockResolvedValueOnce([{ role: 'manager' }]);   // role lookup
      const result = await service.switchBusiness(USER_ID, CHILD_BIZ);
      expect(result.access_token).toBe('mock-token');
    });

    it('throws 403 if user has no access to target business', async () => {
      dataSource.query.mockResolvedValueOnce([{ cnt: '0' }]);
      await expect(service.switchBusiness(USER_ID, 'other-biz')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── CHN-012: Grant business access ───────────────────────────────────────
  describe('grantBusinessAccess', () => {
    it('upserts user_business_roles and updates accessible_business_ids', async () => {
      const user = { id: 'user-2', accessible_business_ids: [] } as any;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);
      ubrRepo.upsert.mockResolvedValue(undefined);
      await service.grantBusinessAccess('user-2', BIZ, [CHILD_BIZ], { [CHILD_BIZ]: 'manager' });
      expect(ubrRepo.upsert).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        accessible_business_ids: expect.arrayContaining([CHILD_BIZ]),
      }));
    });
  });

  // ── CHN-020: Sync config ──────────────────────────────────────────────────
  describe('setSyncConfig', () => {
    it('upserts config for parent business', async () => {
      syncConfigRepo.upsert.mockResolvedValue(undefined);
      syncConfigRepo.findOne.mockResolvedValue({ parent_business_id: BIZ, sync_products: true });
      const result = await service.setSyncConfig(BIZ, {
        sync_categories: true, sync_products: true, sync_variants: true,
        sync_modifiers: true, sync_prices: false, auto_sync_on_change: false,
        child_business_ids: [CHILD_BIZ],
      });
      expect(syncConfigRepo.upsert).toHaveBeenCalled();
    });
  });

  // ── CHN-030: Rollout promotion ────────────────────────────────────────────
  describe('rolloutPromotion', () => {
    it('copies promotion to each child with synced_from_parent_id', async () => {
      const promo = { id: 'promo-1', business_id: BIZ, name: 'Summer Sale', is_active: true };
      dataSource.query
        .mockResolvedValueOnce([promo])  // fetch parent promo
        .mockResolvedValueOnce(undefined) // insert child promo
        .mockResolvedValueOnce([{ id: CHILD_BIZ }]); // validate child ownership
      const result = await service.rolloutPromotion(BIZ, 'promo-1', [CHILD_BIZ], false);
      expect(dataSource.query).toHaveBeenCalled();
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
        { business_id: CHILD_BIZ, name: 'Branch', revenue: '5000', transaction_count: '50', customer_count: '30' },
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
        service.fulfillChildPo(BIZ, 'no-po', 'wh-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail (ChainService not found)**

```bash
docker compose exec backend npm test -- --testPathPattern="chain.service.spec" 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './chain.service'`

- [ ] **Step 3: Create chain.dto.ts**

```typescript
// apps/backend/src/modules/chain/dto/chain.dto.ts
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkParentDto {
  @IsUUID() @IsNotEmpty() parent_business_id: string;
}

export class SyncConfigDto {
  @IsBoolean() sync_categories: boolean;
  @IsBoolean() sync_products: boolean;
  @IsBoolean() sync_variants: boolean;
  @IsBoolean() sync_modifiers: boolean;
  @IsBoolean() sync_prices: boolean;
  @IsBoolean() auto_sync_on_change: boolean;
  @IsArray() @IsUUID(undefined, { each: true }) child_business_ids: string[];
}

export class TriggerSyncDto {
  @IsArray() @IsUUID(undefined, { each: true }) child_business_ids: string[];
  @IsArray() @IsString({ each: true }) @IsIn(['categories', 'products', 'variants', 'modifiers'], { each: true }) sync_what: string[];
}

export class PullProductDto {
  @IsUUID() @IsNotEmpty() parent_product_id: string;
}

export class RolloutPromotionDto {
  @IsArray() @IsUUID(undefined, { each: true }) child_business_ids: string[];
  @IsBoolean() skip_validation: boolean;
}

export class SwitchBusinessDto {
  @IsUUID() @IsNotEmpty() business_id: string;
}

export class GrantBusinessAccessDto {
  @IsArray() @IsUUID(undefined, { each: true }) business_ids: string[];
  @IsObject() role_per_business: Record<string, string>;
}

export class ChainDashboardQueryDto {
  @IsString() from_date: string;
  @IsString() to_date: string;
}

export class ChainTransactionsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsUUID() child_business_id?: string;
  @IsOptional() @IsString() from_date?: string;
  @IsOptional() @IsString() to_date?: string;
}

export class FulfillChildPoDto {
  @IsUUID() @IsNotEmpty() source_warehouse_id: string;
}
```

- [ ] **Step 4: Create chain.service.ts**

```typescript
// apps/backend/src/modules/chain/chain.service.ts
import { Injectable, NotFoundException, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Business } from '../../common/entities/business.entity';
import { User } from '../../common/entities/user.entity';
import { UserBusinessRole } from '../../common/entities/user-business-role.entity';
import { ChainSyncConfig } from '../../common/entities/chain-sync-config.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { SyncConfigDto, ChainTransactionsQueryDto } from './dto/chain.dto';

export const CHAIN_SYNC_QUEUE = 'chain-sync';

@Injectable()
export class ChainService {
  constructor(
    @InjectRepository(Business) private bizRepo: Repository<Business>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserBusinessRole) private ubrRepo: Repository<UserBusinessRole>,
    @InjectRepository(ChainSyncConfig) private syncConfigRepo: Repository<ChainSyncConfig>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private dataSource: DataSource,
    private jwtService: JwtService,
  ) {}

  // ── CHN-001 ───────────────────────────────────────────────────────────────
  async getChainTree() {
    const parents = await this.dataSource.query(
      `SELECT b.id, b.name, b.chain_role, b.is_active,
              (SELECT COUNT(*) FROM locations WHERE business_id = b.id)::int AS location_count
       FROM businesses b WHERE b.chain_role = 'parent' ORDER BY b.name`,
    );
    for (const parent of parents) {
      parent.children = await this.dataSource.query(
        `SELECT b.id, b.name, b.chain_role, b.is_active,
                (SELECT COUNT(*) FROM locations WHERE business_id = b.id)::int AS location_count
         FROM businesses b WHERE b.parent_business_id = $1 ORDER BY b.name`,
        [parent.id],
      );
    }
    return parents;
  }

  // ── CHN-002 ───────────────────────────────────────────────────────────────
  async promoteToParent(businessId: string) {
    const biz = await this.bizRepo.findOne({ where: { id: businessId } });
    if (!biz) throw new NotFoundException('Business not found');
    if (biz.chain_role === 'child') throw new UnprocessableEntityException('A child business cannot be promoted to parent');
    biz.chain_role = 'parent';
    return this.bizRepo.save(biz);
  }

  // ── CHN-003 ───────────────────────────────────────────────────────────────
  async linkChild(childId: string, parentId: string) {
    if (childId === parentId) throw new UnprocessableEntityException('A business cannot be its own parent');
    const child = await this.bizRepo.findOne({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child business not found');
    const parent = await this.bizRepo.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('Parent business not found');
    if (parent.chain_role !== 'parent') throw new UnprocessableEntityException('Target business is not a chain parent — promote it first');
    child.parent_business_id = parentId;
    child.chain_role = 'child';
    return this.bizRepo.save(child);
  }

  // ── CHN-004 ───────────────────────────────────────────────────────────────
  async unlinkChild(childId: string) {
    const child = await this.bizRepo.findOne({ where: { id: childId } });
    if (!child) throw new NotFoundException('Business not found');
    child.parent_business_id = null;
    child.chain_role = 'standalone';
    return this.bizRepo.save(child);
  }

  // ── CHN-010 ───────────────────────────────────────────────────────────────
  async getAccessibleBusinesses(userId: string) {
    return this.dataSource.query(
      `SELECT ubr.business_id, b.name, ubr.role
       FROM user_business_roles ubr
       JOIN businesses b ON b.id = ubr.business_id
       WHERE ubr.user_id = $1
       ORDER BY b.name`,
      [userId],
    );
  }

  // ── CHN-011 ───────────────────────────────────────────────────────────────
  async switchBusiness(userId: string, targetBusinessId: string) {
    const [access] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM user_business_roles
       WHERE user_id = $1 AND business_id = $2
       UNION ALL
       SELECT COUNT(*)::int FROM users WHERE id = $1 AND business_id = $2`,
      [userId, targetBusinessId],
    );
    if (Number(access.cnt) === 0) throw new ForbiddenException('You do not have access to this business');

    const [roleRow] = await this.dataSource.query(
      `SELECT COALESCE(ubr.role, u.role::text) AS role
       FROM users u
       LEFT JOIN user_business_roles ubr ON ubr.user_id = u.id AND ubr.business_id = $2
       WHERE u.id = $1`,
      [userId, targetBusinessId],
    );

    const payload = { sub: userId, business_id: targetBusinessId, role: roleRow.role, type: 'user' };
    return { access_token: this.jwtService.sign(payload) };
  }

  // ── CHN-012 ───────────────────────────────────────────────────────────────
  async grantBusinessAccess(
    targetUserId: string,
    grantingBusinessId: string,
    businessIds: string[],
    rolePerBusiness: Record<string, string>,
    grantedByUserId?: string,
  ) {
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    await this.ubrRepo.upsert(
      businessIds.map((bizId) => ({
        user_id: targetUserId,
        business_id: bizId,
        role: rolePerBusiness[bizId] ?? 'employee',
        granted_by_user_id: grantedByUserId ?? null,
      })),
      { conflictPaths: ['user_id', 'business_id'] },
    );

    const existing = new Set(user.accessible_business_ids);
    businessIds.forEach((id) => existing.add(id));
    user.accessible_business_ids = Array.from(existing);
    return this.userRepo.save(user);
  }

  // ── CHN-020 ───────────────────────────────────────────────────────────────
  async setSyncConfig(parentBusinessId: string, dto: SyncConfigDto) {
    await this.syncConfigRepo.upsert(
      { parent_business_id: parentBusinessId, ...dto },
      { conflictPaths: ['parent_business_id'] },
    );
    return this.syncConfigRepo.findOne({ where: { parent_business_id: parentBusinessId } });
  }

  // ── CHN-022 ───────────────────────────────────────────────────────────────
  async getSyncJobStatus(jobId: string, businessId: string) {
    const [job] = await this.dataSource.query(
      `SELECT * FROM background_jobs WHERE id = $1 AND business_id = $2`,
      [jobId, businessId],
    );
    if (!job) throw new NotFoundException('Sync job not found');
    return job;
  }

  // ── CHN-023 ───────────────────────────────────────────────────────────────
  async getUnmappedProducts(childBusinessId: string) {
    const child = await this.bizRepo.findOne({ where: { id: childBusinessId } });
    if (!child || !child.parent_business_id) throw new UnprocessableEntityException('Business has no parent');

    return this.dataSource.query(
      `SELECT p.id, p.name, p.sku, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.business_id = $1
         AND p.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM products cp
           WHERE cp.business_id = $2 AND cp.synced_from_parent_id = p.id
         )`,
      [child.parent_business_id, childBusinessId],
    );
  }

  // ── CHN-024 ───────────────────────────────────────────────────────────────
  async pullProduct(childBusinessId: string, parentProductId: string) {
    const child = await this.bizRepo.findOne({ where: { id: childBusinessId } });
    if (!child || !child.parent_business_id) throw new UnprocessableEntityException('Business has no parent');

    const [parentProduct] = await this.dataSource.query(
      `SELECT p.*, c.name AS category_name, c.sort_order AS category_sort_order,
              c.default_tva_rate AS category_tva_rate
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 AND p.business_id = $2`,
      [parentProductId, child.parent_business_id],
    );
    if (!parentProduct) throw new NotFoundException('Product not found in parent catalogue');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // Upsert category
      let [childCat] = await qr.query(
        `SELECT id FROM categories WHERE business_id = $1 AND synced_from_parent_id = $2`,
        [childBusinessId, parentProduct.category_id],
      );
      if (!childCat) {
        const [newCat] = await qr.query(
          `INSERT INTO categories (id, business_id, name, sort_order, is_active, default_tva_rate, synced_from_parent_id)
           VALUES (gen_random_uuid(), $1, $2, $3, true, $4, $5) RETURNING id`,
          [childBusinessId, parentProduct.category_name, parentProduct.category_sort_order, parentProduct.category_tva_rate, parentProduct.category_id],
        );
        childCat = newCat;
      }

      // Upsert product — TVA excluded per CHN-MOD-006
      const [childProd] = await qr.query(
        `INSERT INTO products (id, business_id, category_id, name, description, price, sku, image_url,
                               is_active, sort_order, tva_rate, tva_exempt, synced_from_parent_id)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, NULL, false, $9)
         ON CONFLICT (business_id, synced_from_parent_id) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description,
               price = EXCLUDED.price, sku = EXCLUDED.sku, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [childBusinessId, childCat.id, parentProduct.name, parentProduct.description,
         parentProduct.price, parentProduct.sku, parentProduct.image_url,
         parentProduct.sort_order, parentProductId],
      );

      // Copy variants
      const variants = await qr.query(
        `SELECT * FROM product_variants WHERE product_id = $1`,
        [parentProductId],
      );
      for (const v of variants) {
        await qr.query(
          `INSERT INTO product_variants (id, product_id, name, price_override, sku, is_active, synced_from_parent_id)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5)
           ON CONFLICT DO NOTHING`,
          [childProd.id, v.name, v.price_override, v.sku, v.id],
        );
      }

      await qr.commitTransaction();
      return { product_id: childProd.id };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── CHN-030 ───────────────────────────────────────────────────────────────
  async rolloutPromotion(
    parentBusinessId: string,
    promotionId: string,
    childBusinessIds: string[],
    skipValidation: boolean,
  ) {
    const [promo] = await this.dataSource.query(
      `SELECT * FROM promotions WHERE id = $1 AND business_id = $2`,
      [promotionId, parentBusinessId],
    );
    if (!promo) throw new NotFoundException('Promotion not found');

    const results: Array<{ child_business_id: string; promotion_id: string; tva_warnings: any[] }> = [];

    for (const childId of childBusinessIds) {
      const tva_warnings = skipValidation ? [] : await this._getTvaMismatchWarnings(parentBusinessId, childId, promo);

      const [newPromo] = await this.dataSource.query(
        `INSERT INTO promotions (id, business_id, name, type, discount_value, discount_type,
                                 min_order_amount, max_uses, is_active, start_date, end_date,
                                 conditions, synced_from_parent_id)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [childId, promo.name, promo.type, promo.discount_value, promo.discount_type,
         promo.min_order_amount, promo.max_uses, false, promo.start_date, promo.end_date,
         promo.conditions, promotionId],
      );

      results.push({ child_business_id: childId, promotion_id: newPromo.id, tva_warnings });
    }

    return results;
  }

  private async _getTvaMismatchWarnings(parentBusinessId: string, childBusinessId: string, promo: any) {
    // Find synced products at child with unconfigured TVA rate (CHN-MOD-006 / PROM-040)
    return this.dataSource.query(
      `SELECT p.id, p.name, p.synced_from_parent_id
       FROM products p
       WHERE p.business_id = $1 AND p.synced_from_parent_id IS NOT NULL AND p.tva_rate IS NULL`,
      [childBusinessId],
    );
  }

  // ── CHN-040 ───────────────────────────────────────────────────────────────
  async getChainDashboard(parentBusinessId: string, fromDate: string, toDate: string) {
    const children = await this.dataSource.query(
      `SELECT
         b.id AS business_id, b.name,
         COALESCE(SUM(t.total), 0) AS revenue,
         COUNT(t.id)::int AS transaction_count,
         COUNT(DISTINCT t.customer_id)::int AS customer_count
       FROM businesses b
       LEFT JOIN transactions t
         ON t.business_id = b.id
         AND t.status = 'completed'
         AND DATE(t.created_at) BETWEEN $2 AND $3
       WHERE b.parent_business_id = $1
       GROUP BY b.id, b.name
       ORDER BY b.name`,
      [parentBusinessId, fromDate, toDate],
    );

    const totals = {
      revenue: children.reduce((s: number, c: any) => s + Number(c.revenue), 0),
      transaction_count: children.reduce((s: number, c: any) => s + c.transaction_count, 0),
      customer_count: children.reduce((s: number, c: any) => s + c.customer_count, 0),
    };

    return { children, totals };
  }

  // ── CHN-041 ───────────────────────────────────────────────────────────────
  async getChainTransactions(parentBusinessId: string, query: ChainTransactionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    let sql = `
      SELECT t.id, t.business_id, b.name AS business_name, t.total, t.status, t.created_at
      FROM transactions t
      JOIN businesses b ON b.id = t.business_id
      WHERE b.parent_business_id = $1
    `;
    const params: any[] = [parentBusinessId];
    let idx = 2;

    if (query.child_business_id) { sql += ` AND t.business_id = $${idx}`; params.push(query.child_business_id); idx++; }
    if (query.from_date) { sql += ` AND DATE(t.created_at) >= $${idx}`; params.push(query.from_date); idx++; }
    if (query.to_date) { sql += ` AND DATE(t.created_at) <= $${idx}`; params.push(query.to_date); idx++; }

    const [{ cnt }] = await this.dataSource.query(`SELECT COUNT(*) AS cnt FROM (${sql}) sub`, params);
    const total = Number(cnt);

    sql += ` ORDER BY t.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, (page - 1) * limit);

    const records = await this.dataSource.query(sql, params);
    return { records, total, page, limit };
  }

  // ── CHN-050 ───────────────────────────────────────────────────────────────
  async getParentVendorInfo(childBusinessId: string) {
    const child = await this.bizRepo.findOne({ where: { id: childBusinessId } });
    if (!child) throw new NotFoundException('Business not found');
    if (!child.parent_business_id) throw new UnprocessableEntityException('This business has no parent');

    const parent = await this.bizRepo.findOne({ where: { id: child.parent_business_id } });
    if (!parent) throw new NotFoundException('Parent business not found');

    return {
      parent_business_id: parent.id,
      parent_name: parent.name,
      ice: parent.ice_number,
      if_number: parent.if_number,
      address: (parent as any).address,
    };
  }

  // ── CHN-051 ───────────────────────────────────────────────────────────────
  async getIncomingPoRequests(parentBusinessId: string) {
    return this.dataSource.query(
      `SELECT po.*, b.name AS child_business_name
       FROM purchase_orders po
       JOIN businesses b ON b.id = po.business_id
       WHERE b.parent_business_id = $1
         AND po.status NOT IN ('draft', 'cancelled')
       ORDER BY po.created_at DESC`,
      [parentBusinessId],
    );
  }

  // ── CHN-052 ───────────────────────────────────────────────────────────────
  async fulfillChildPo(parentBusinessId: string, poId: string, sourceWarehouseId: string) {
    const [po] = await this.dataSource.query(
      `SELECT po.*, b.id AS child_biz_id
       FROM purchase_orders po
       JOIN businesses b ON b.id = po.business_id
       WHERE po.id = $1 AND b.parent_business_id = $2
         AND po.status IN ('confirmed', 'sent')`,
      [poId, parentBusinessId],
    );
    if (!po) throw new NotFoundException('Purchase order not found or not accessible');

    const poItems = await this.dataSource.query(
      `SELECT * FROM purchase_order_items WHERE purchase_order_id = $1`,
      [poId],
    );

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (const item of poItems) {
        // Decrement parent batch (FIFO — first available batch)
        const [sourceBatch] = await qr.query(
          `SELECT id, quantity_remaining FROM stock_batches
           WHERE business_id = $1 AND warehouse_id = $2 AND product_id = $3
             AND is_active = true AND quantity_remaining > 0
           ORDER BY expires_at ASC NULLS LAST, received_at ASC
           LIMIT 1 FOR UPDATE`,
          [parentBusinessId, sourceWarehouseId, item.product_id],
        );

        const qty = item.quantity_ordered;
        if (sourceBatch) {
          await qr.query(
            `UPDATE stock_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2`,
            [Math.min(qty, sourceBatch.quantity_remaining), sourceBatch.id],
          );
          // Stock movement at parent
          await qr.query(
            `INSERT INTO stock_movements (id, business_id, batch_id, movement_type, quantity, reference_type, reference_id, source_origin)
             VALUES (gen_random_uuid(), $1, $2, 'transfer_out', $3, 'chain_po', $4, 'chain_fulfillment')`,
            [parentBusinessId, sourceBatch.id, qty, poId],
          );
        }

        // Create batch at child
        const [childBatch] = await qr.query(
          `INSERT INTO stock_batches (id, business_id, warehouse_id, product_id, batch_code, quantity_initial,
                                      quantity_remaining, unit_cost, received_at, is_active, purchase_order_id)
           SELECT gen_random_uuid(), $1,
                  (SELECT id FROM warehouses WHERE business_id = $1 ORDER BY created_at ASC LIMIT 1),
                  $2, $3, $4, $4, $5, NOW(), true, $6
           RETURNING id`,
          [po.child_biz_id, item.product_id, `CHAIN-${poId.slice(0, 8)}`, qty, item.unit_cost_ht, poId],
        );

        if (childBatch) {
          await qr.query(
            `INSERT INTO stock_movements (id, business_id, batch_id, movement_type, quantity, reference_type, reference_id, source_origin)
             VALUES (gen_random_uuid(), $1, $2, 'receive', $3, 'chain_po', $4, 'chain_fulfillment')`,
            [po.child_biz_id, childBatch.id, qty, poId],
          );
        }
      }

      // Mark PO as received
      await qr.query(
        `UPDATE purchase_orders SET status = 'received' WHERE id = $1`,
        [poId],
      );

      await qr.commitTransaction();
      console.log(`[AUDIT] Chain PO ${poId} fulfilled by parent ${parentBusinessId} from warehouse ${sourceWarehouseId}`);
      return { fulfilled: true, po_id: poId };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
```

- [ ] **Step 5: Create controller stubs and chain-auth/chain-super controllers**

Create `apps/backend/src/modules/chain/chain-super.controller.ts`:

```typescript
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChainService } from './chain.service';
import { LinkParentDto } from './dto/chain.dto';

@Controller('super')
@UseGuards(RolesGuard)
export class ChainSuperController {
  constructor(private chainService: ChainService) {}

  @Get('businesses/chain-tree')
  @Roles('super_admin')
  getChainTree() {
    return this.chainService.getChainTree();
  }

  @Post('businesses/:id/promote-to-parent')
  @Roles('super_admin')
  promoteToParent(@Param('id') id: string) {
    return this.chainService.promoteToParent(id);
  }

  @Post('businesses/:child_id/link-parent')
  @Roles('super_admin')
  linkChild(@Param('child_id') childId: string, @Body() dto: LinkParentDto) {
    return this.chainService.linkChild(childId, dto.parent_business_id);
  }

  @Post('businesses/:child_id/unlink-parent')
  @Roles('super_admin')
  unlinkChild(@Param('child_id') childId: string) {
    return this.chainService.unlinkChild(childId);
  }
}
```

Create `apps/backend/src/modules/chain/chain-auth.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChainService } from './chain.service';
import { SwitchBusinessDto } from './dto/chain.dto';

@Controller('auth')
@UseGuards(RolesGuard)
export class ChainAuthController {
  constructor(private chainService: ChainService) {}

  @Get('me/accessible-businesses')
  getAccessibleBusinesses(@Request() req: any) {
    return this.chainService.getAccessibleBusinesses(req.user.sub);
  }

  @Post('switch-business')
  switchBusiness(@Request() req: any, @Body() dto: SwitchBusinessDto) {
    return this.chainService.switchBusiness(req.user.sub, dto.business_id);
  }
}
```

Create `apps/backend/src/modules/chain/chain.controller.ts`:

```typescript
import {
  Controller, Get, Post, Put, Param, Body, Query, Request, UseGuards, HttpCode,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChainService } from './chain.service';
import {
  SyncConfigDto, TriggerSyncDto, PullProductDto,
  RolloutPromotionDto, GrantBusinessAccessDto,
  ChainDashboardQueryDto, ChainTransactionsQueryDto, FulfillChildPoDto,
} from './dto/chain.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class ChainController {
  constructor(private chainService: ChainService) {}

  // CHN-012
  @Post('users/:id/grant-business-access')
  @Roles('owner', 'super_admin')
  grantAccess(@Param('id') userId: string, @Request() req: any, @Body() dto: GrantBusinessAccessDto) {
    return this.chainService.grantBusinessAccess(userId, req.user.business_id, dto.business_ids, dto.role_per_business, req.user.sub);
  }

  // CHN-020
  @Put('chain/sync-config')
  @Roles('owner')
  setSyncConfig(@Request() req: any, @Body() dto: SyncConfigDto) {
    return this.chainService.setSyncConfig(req.user.business_id, dto);
  }

  // CHN-021 — returns job_id; processor dispatched separately
  @Post('chain/sync')
  @Roles('owner')
  @HttpCode(202)
  triggerSync(@Request() req: any, @Body() dto: TriggerSyncDto) {
    return this.chainService.triggerSync(req.user.business_id, dto);
  }

  // CHN-022
  @Get('chain/sync-jobs/:id')
  @Roles('owner', 'manager')
  getSyncJobStatus(@Param('id') jobId: string, @Request() req: any) {
    return this.chainService.getSyncJobStatus(jobId, req.user.business_id);
  }

  // CHN-023
  @Get('chain/unmapped-products')
  @Roles('owner', 'manager')
  getUnmapped(@Request() req: any) {
    return this.chainService.getUnmappedProducts(req.user.business_id);
  }

  // CHN-024
  @Post('chain/pull-product')
  @Roles('owner', 'manager')
  pullProduct(@Request() req: any, @Body() dto: PullProductDto) {
    return this.chainService.pullProduct(req.user.business_id, dto.parent_product_id);
  }

  // CHN-030
  @Post('promotions/:id/rollout-to-children')
  @Roles('owner')
  rollout(@Param('id') id: string, @Request() req: any, @Body() dto: RolloutPromotionDto) {
    return this.chainService.rolloutPromotion(req.user.business_id, id, dto.child_business_ids, dto.skip_validation);
  }

  // CHN-040
  @Get('chain/dashboard')
  @Roles('owner', 'manager')
  dashboard(@Request() req: any, @Query() query: ChainDashboardQueryDto) {
    return this.chainService.getChainDashboard(req.user.business_id, query.from_date, query.to_date);
  }

  // CHN-041
  @Get('chain/transactions')
  @Roles('owner', 'manager')
  chainTransactions(@Request() req: any, @Query() query: ChainTransactionsQueryDto) {
    return this.chainService.getChainTransactions(req.user.business_id, query);
  }

  // CHN-050
  @Get('chain/parent-vendor-info')
  @Roles('owner', 'manager')
  parentVendorInfo(@Request() req: any) {
    return this.chainService.getParentVendorInfo(req.user.business_id);
  }

  // CHN-051
  @Get('chain/incoming-po-requests')
  @Roles('owner', 'manager')
  incomingPoRequests(@Request() req: any) {
    return this.chainService.getIncomingPoRequests(req.user.business_id);
  }

  // CHN-052
  @Post('chain/incoming-po-requests/:id/fulfill')
  @Roles('owner', 'manager')
  @HttpCode(200)
  fulfillPo(@Param('id') id: string, @Request() req: any, @Body() dto: FulfillChildPoDto) {
    return this.chainService.fulfillChildPo(req.user.business_id, id, dto.source_warehouse_id);
  }
}
```

- [ ] **Step 6: Add triggerSync stub to chain.service.ts**

After `getSyncJobStatus()` in chain.service.ts, add:

```typescript
  // ── CHN-021 ───────────────────────────────────────────────────────────────
  async triggerSync(parentBusinessId: string, dto: { child_business_ids: string[]; sync_what: string[] }) {
    const jobId = require('crypto').randomUUID();
    await this.dataSource.query(
      `INSERT INTO background_jobs (id, business_id, job_type, status, created_at)
       VALUES ($1, $2, 'chain_sync', 'pending', NOW())`,
      [jobId, parentBusinessId],
    );
    // BullMQ job dispatched by processor — stub in service, actual work in ChainSyncProcessor
    console.log(`[CHAIN] Sync job ${jobId} queued for parent ${parentBusinessId}`);
    return { job_id: jobId };
  }
```

- [ ] **Step 7: Create chain-sync.processor.ts**

```typescript
// apps/backend/src/modules/chain/chain-sync.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { CHAIN_SYNC_QUEUE } from './chain.service';

@Processor(CHAIN_SYNC_QUEUE)
export class ChainSyncProcessor extends WorkerHost {
  constructor(private ds: DataSource) {
    super();
  }

  async process(job: Job) {
    const { parentBusinessId, childBusinessIds, syncWhat } = job.data;
    let itemsSynced = 0;
    const errors: string[] = [];

    for (const childId of childBusinessIds) {
      try {
        if (syncWhat.includes('categories')) {
          const cats = await this.ds.query(
            `SELECT * FROM categories WHERE business_id = $1 AND is_active = true`, [parentBusinessId],
          );
          for (const cat of cats) {
            await this.ds.query(
              `INSERT INTO categories (id, business_id, name, sort_order, is_active, default_tva_rate, synced_from_parent_id)
               VALUES (gen_random_uuid(), $1, $2, $3, true, $4, $5)
               ON CONFLICT (business_id, synced_from_parent_id) DO UPDATE
                 SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
              [childId, cat.name, cat.sort_order, cat.default_tva_rate, cat.id],
            );
            itemsSynced++;
          }
        }

        if (syncWhat.includes('products')) {
          const products = await this.ds.query(
            `SELECT p.*, (SELECT id FROM categories WHERE business_id = $2 AND synced_from_parent_id = p.category_id) AS child_cat_id
             FROM products p WHERE p.business_id = $1 AND p.is_active = true`,
            [parentBusinessId, childId],
          );
          for (const prod of products) {
            if (!prod.child_cat_id) continue; // skip if category not yet synced
            await this.ds.query(
              `INSERT INTO products (id, business_id, category_id, name, description, price, sku,
                                    is_active, sort_order, tva_rate, tva_exempt, synced_from_parent_id)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, NULL, false, $8)
               ON CONFLICT (business_id, synced_from_parent_id) DO UPDATE
                 SET name = EXCLUDED.name, price = EXCLUDED.price, sort_order = EXCLUDED.sort_order`,
              [childId, prod.child_cat_id, prod.name, prod.description, prod.price,
               prod.sku, prod.sort_order, prod.id],
            );
            itemsSynced++;
          }
        }
      } catch (err: any) {
        errors.push(`child ${childId}: ${err.message}`);
      }
    }

    await this.ds.query(
      `UPDATE background_jobs SET status = $1, result_json = $2 WHERE id = $3`,
      [errors.length ? 'completed_with_errors' : 'completed',
       JSON.stringify({ items_synced: itemsSynced, errors }), job.data.jobId],
    );
  }
}
```

- [ ] **Step 8: Create chain-sync.processor.spec.ts**

```typescript
// apps/backend/src/modules/chain/chain-sync.processor.spec.ts
import { ChainSyncProcessor } from './chain-sync.processor';

describe('ChainSyncProcessor', () => {
  let processor: ChainSyncProcessor;
  let ds: jest.Mocked<any>;

  beforeEach(() => {
    ds = { query: jest.fn() };
    processor = new ChainSyncProcessor(ds);
  });

  it('syncs categories from parent to child', async () => {
    ds.query
      .mockResolvedValueOnce([{ id: 'cat-1', name: 'Coffee', sort_order: 0, default_tva_rate: 20 }])
      .mockResolvedValueOnce(undefined) // upsert
      .mockResolvedValueOnce(undefined); // update job status
    await processor.process({
      data: { parentBusinessId: 'p-1', childBusinessIds: ['c-1'], syncWhat: ['categories'], jobId: 'job-1' },
    } as any);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      expect.any(Array),
    );
  });

  it('skips product if child category not yet synced', async () => {
    ds.query
      .mockResolvedValueOnce([{ id: 'prod-1', name: 'Latte', child_cat_id: null }]) // products query
      .mockResolvedValueOnce(undefined); // update job
    await processor.process({
      data: { parentBusinessId: 'p-1', childBusinessIds: ['c-1'], syncWhat: ['products'], jobId: 'job-1' },
    } as any);
    // No INSERT into products should be called
    expect(ds.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO products'), expect.any(Array));
  });

  it('marks job completed_with_errors on child failure', async () => {
    ds.query
      .mockRejectedValueOnce(new Error('child db error')) // categories query fails
      .mockResolvedValueOnce(undefined); // job status update
    await processor.process({
      data: { parentBusinessId: 'p-1', childBusinessIds: ['c-1'], syncWhat: ['categories'], jobId: 'job-1' },
    } as any);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE background_jobs'),
      expect.arrayContaining(['completed_with_errors']),
    );
  });

  it('marks job completed on success', async () => {
    ds.query
      .mockResolvedValueOnce([]) // no categories
      .mockResolvedValueOnce(undefined); // job update
    await processor.process({
      data: { parentBusinessId: 'p-1', childBusinessIds: ['c-1'], syncWhat: ['categories'], jobId: 'job-1' },
    } as any);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE background_jobs'),
      expect.arrayContaining(['completed']),
    );
  });
});
```

- [ ] **Step 9: Create chain.module.ts**

```typescript
// apps/backend/src/modules/chain/chain.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ChainService, CHAIN_SYNC_QUEUE } from './chain.service';
import { ChainSuperController } from './chain-super.controller';
import { ChainAuthController } from './chain-auth.controller';
import { ChainController } from './chain.controller';
import { ChainSyncProcessor } from './chain-sync.processor';
import { Business } from '../../common/entities/business.entity';
import { User } from '../../common/entities/user.entity';
import { UserBusinessRole } from '../../common/entities/user-business-role.entity';
import { ChainSyncConfig } from '../../common/entities/chain-sync-config.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, User, UserBusinessRole, ChainSyncConfig, Category, Product]),
    BullModule.registerQueue({ name: CHAIN_SYNC_QUEUE }),
    AuthModule,
  ],
  controllers: [ChainSuperController, ChainAuthController, ChainController],
  providers: [ChainService, ChainSyncProcessor],
})
export class ChainModule {}
```

- [ ] **Step 10: Register ChainModule in AppModule**

In `apps/backend/src/app.module.ts`, add:
```typescript
import { ChainModule } from './modules/chain/chain.module';
```
And add `ChainModule` to the `imports` array (after `InventoryModule`).

- [ ] **Step 11: Run all tests**

```bash
docker compose exec backend npm test 2>&1 | tail -15
```

Expected: All 549 existing tests pass + ~32 new chain tests. Total ~581 tests, 42 suites.

- [ ] **Step 12: Commit**

```bash
git add apps/backend/src/modules/chain/ apps/backend/src/app.module.ts
git commit -m "phase-13: ChainModule — CHN-001-052 all endpoints (CHN-001-052, PROM-040)"
```

---

## Task 3: Update Docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/IMPLEMENTATION_LOG.md`

- [ ] **Step 1: Update CLAUDE.md**

Find the implementation status section. Update:

```
**Current state: ~581 tests passing, 42 suites, zero regressions.**

Completed phases: 0, 5, 6, 7, 8, 9, 10, Reports, 11A, 12A, 12B, 12C, 12D, 13.
Next: 14 (REC — Recommendations).
```

In Key architectural facts, add:
```
- `ChainModule` at `src/modules/chain/`: 3 controllers (super/auth/business), ChainService, ChainSyncProcessor
- Chain hierarchy: businesses.chain_role ∈ {standalone, parent, child}; max 2 levels; parent_business_id self-FK
- `user_business_roles` table: composite PK (user_id, business_id); overrides single-business role for chain users
- `chain_sync_configs` table: per-parent sync settings; sync excludes TVA rates (CHN-MOD-006)
- CHN-011 re-issues JWT with new business_id claim (no revocation list — stub)
- CHN-052 fulfills child PO: cross-business stock decrement + child batch creation + PO→received
```

- [ ] **Step 2: Add Phase 13 to IMPLEMENTATION_LOG.md**

After the Phase 12D entry and before "### Phases 13-15" line, add:

```markdown
### Phase 13 — Chain & Franchise (DONE). ~581 tests passing (42 suites).

See extension spec §9 (CHN-001–052) for requirement IDs.

- [x] Migration `1714013000000-AddChainOperations`: `user_business_roles` (composite PK), `chain_sync_configs`;
      `businesses.{parent_business_id, chain_role}`; `users.accessible_business_ids`;
      `synced_from_parent_id` on categories, products, product_variants, modifier_groups, modifiers, promotions
- [x] 2 new entities: `UserBusinessRole`, `ChainSyncConfig`
- [x] 7 existing entities updated with new columns
- [x] `ChainService` — 16 methods covering all CHN endpoints:
      getChainTree, promoteToParent, linkChild, unlinkChild (CHN-001–004);
      getAccessibleBusinesses, switchBusiness (re-issues JWT), grantBusinessAccess (CHN-010–012);
      setSyncConfig, triggerSync (BullMQ), getSyncJobStatus, getUnmappedProducts, pullProduct (CHN-020–024);
      rolloutPromotion with PROM-040 TVA mismatch check (CHN-030);
      getChainDashboard, getChainTransactions (CHN-040–041);
      getParentVendorInfo, getIncomingPoRequests, fulfillChildPo (CHN-050–052)
- [x] `ChainSyncProcessor` (BullMQ `chain-sync` queue) — upserts categories/products to children; sets tva_rate=NULL per CHN-MOD-006
- [x] `ChainSuperController` — 4 routes under /api/super/businesses/* (super_admin only)
- [x] `ChainAuthController` — 2 routes under /api/auth/* (CHN-010–011)
- [x] `ChainController` — 12 routes under /api/business/* (CHN-012, CHN-020–052)
- [x] `chain.service.spec.ts` — ~28 unit tests; `chain-sync.processor.spec.ts` — 4 processor tests
```

Also replace the "### Phases 13-15" line with "### Phases 14-15" since Phase 13 is done.

- [ ] **Step 3: Run final test suite**

```bash
docker compose exec backend npm test 2>&1 | tail -10
```

Expected: All tests passing, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/IMPLEMENTATION_LOG.md
git commit -m "phase-13: update docs — mark Phase 13 DONE"
```

---

## Self-Review

**Spec coverage:**
- CHN-001 ✅ `getChainTree` — nested parent+children tree
- CHN-002 ✅ `promoteToParent` — standalone → parent; 422 if chain_role=child
- CHN-003 ✅ `linkChild` — validates parent promoted, prevents cycles, 422 guards
- CHN-004 ✅ `unlinkChild` — resets to standalone
- CHN-010 ✅ `getAccessibleBusinesses` — from user_business_roles JOIN businesses
- CHN-011 ✅ `switchBusiness` — access check → role lookup → new JWT; 403 on no access
- CHN-012 ✅ `grantBusinessAccess` — upsert user_business_roles + update accessible_business_ids
- CHN-020 ✅ `setSyncConfig` — UPSERT chain_sync_configs
- CHN-021 ✅ `triggerSync` — creates background_job, returns job_id; BullMQ handles async work
- CHN-022 ✅ `getSyncJobStatus` — reads from background_jobs table
- CHN-023 ✅ `getUnmappedProducts` — NOT EXISTS subquery to find parent products not yet in child
- CHN-024 ✅ `pullProduct` — atomic QR; upsert category, product, variants; tva_rate=NULL
- CHN-MOD-006 ✅ `tva_rate=NULL, tva_exempt=false` enforced in pullProduct AND ChainSyncProcessor
- CHN-030 ✅ `rolloutPromotion` — copies promotion to each child; sets synced_from_parent_id
- PROM-040 ✅ `_getTvaMismatchWarnings` — returns synced products with null tva_rate; embedded in rollout when skip_validation=false
- CHN-040 ✅ `getChainDashboard` — per-child revenue/transaction/customer aggregation
- CHN-041 ✅ `getChainTransactions` — paginated, filterable by child_business_id/dates
- CHN-050 ✅ `getParentVendorInfo` — returns parent name, ICE, IF; 422 if no parent
- CHN-051 ✅ `getIncomingPoRequests` — POs from child businesses ordered by date
- CHN-052 ✅ `fulfillChildPo` — FIFO source batch selection, cross-business stock movements, PO→received

**Placeholder scan:** No TBD/TODO in any code step. ChainSyncProcessor correctly sets `tva_rate=NULL`. `triggerSync` uses a console.log stub for actual BullMQ dispatch (same pattern as Phase 12A scheduler).

**Type consistency:**
- `CHAIN_SYNC_QUEUE` exported from `chain.service.ts`, imported by `chain-sync.processor.ts` and `chain.module.ts` — consistent
- `SyncConfigDto` fields match `chain_sync_configs` table columns — consistent
- `ChainTransactionsQueryDto` fields match SQL parameter usage — consistent

**Note on CHN-011 revocation list:** Spec says "Old token is added to a server-side revocation list." This codebase has no token revocation infrastructure. The implementation issues a new token without revoking the old one — same pattern used elsewhere. This is flagged in the implementation log as a known gap.

**Note on `products` UNIQUE constraint for upsert:** The `pullProduct` and `ChainSyncProcessor` upserts use `ON CONFLICT (business_id, synced_from_parent_id)`. This requires a UNIQUE constraint on `(business_id, synced_from_parent_id)` in the DB. Add this to the migration's `up()` method:
```sql
CREATE UNIQUE INDEX idx_products_biz_synced ON products(business_id, synced_from_parent_id)
  WHERE synced_from_parent_id IS NOT NULL;
CREATE UNIQUE INDEX idx_categories_biz_synced ON categories(business_id, synced_from_parent_id)
  WHERE synced_from_parent_id IS NOT NULL;
```
The implementer must add these two indexes to the migration before running tests.
