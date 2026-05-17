# Phase 12B — Transfer Documents & Adjustment Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stock transfer documents (multi-item, auditable, immutable after posting) and an optional approval workflow for stock adjustments, gated by the `stock_adjustment_approval` feature flag.

**Architecture:** Two new services (`StockAdjustmentService`, `StockTransferService`) live alongside existing inventory services inside `InventoryModule`. `StockBatchService` gains two new public methods (`applyBatchAdjustmentInQr`, `executeBatchTransferInQr`) that contain the shared atomic batch-manipulation logic; both new services call these within their own QueryRunners. The existing `adjustBatch()` and `transferBatch()` signatures are unchanged — `adjustBatch()` gains only a feature-flag gate check prepended at the top so that all 497 existing tests continue to pass unmodified.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, `DataSource`/`QueryRunner`, class-validator DTOs, Jest unit tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `apps/backend/src/migrations/1714011000000-AddStockTransfersAndAdjustments.ts` | 4 tables + feature flag insert |
| Create | `apps/backend/src/common/entities/stock-adjustment.entity.ts` | `StockAdjustment` entity |
| Create | `apps/backend/src/common/entities/stock-adjustment-item.entity.ts` | `StockAdjustmentItem` entity |
| Create | `apps/backend/src/common/entities/stock-transfer.entity.ts` | `StockTransfer` entity |
| Create | `apps/backend/src/common/entities/stock-transfer-item.entity.ts` | `StockTransferItem` entity |
| Modify | `apps/backend/src/common/entities/index.ts` | Export 4 new entities |
| Create | `apps/backend/src/modules/inventory/dto/stock-adjustment-transfer.dto.ts` | All new DTOs |
| Modify | `apps/backend/src/modules/inventory/stock-batch.service.ts` | Feature flag gate + 2 new public methods |
| Create | `apps/backend/src/modules/inventory/stock-adjustment.service.ts` | 7 adjustment operations |
| Create | `apps/backend/src/modules/inventory/stock-adjustment.controller.ts` | 7 endpoints |
| Create | `apps/backend/src/modules/inventory/stock-transfer.service.ts` | 6 transfer operations |
| Create | `apps/backend/src/modules/inventory/stock-transfer.controller.ts` | 6 endpoints |
| Modify | `apps/backend/src/modules/inventory/inventory.module.ts` | Register new entities, services, controllers |
| Create | `apps/backend/src/modules/inventory/stock-adjustment.service.spec.ts` | Tests for StockAdjustmentService |
| Create | `apps/backend/src/modules/inventory/stock-transfer.service.spec.ts` | Tests for StockTransferService |
| Modify | `apps/backend/CLAUDE.md` | Update test count |
| Modify | `docs/IMPLEMENTATION_LOG.md` | Add Phase 12B section |

---

## Task 1: Migration — `AddStockTransfersAndAdjustments`

**Files:**
- Create: `apps/backend/src/migrations/1714011000000-AddStockTransfersAndAdjustments.ts`

- [ ] **Step 1: Write the migration file**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockTransfersAndAdjustments1714011000000 implements MigrationInterface {
  name = 'AddStockTransfersAndAdjustments1714011000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. stock_adjustments
    await queryRunner.query(`
      CREATE TABLE "stock_adjustments" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"           UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "adjustment_number"     VARCHAR(50) NOT NULL,
        "warehouse_id"          UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "status"                VARCHAR(20) NOT NULL DEFAULT 'draft',
        "reason"                TEXT NOT NULL,
        "proposed_by_user_id"   UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "approved_by_user_id"   UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at"           TIMESTAMPTZ,
        "posted_at"             TIMESTAMPTZ,
        "rejected_reason"       TEXT,
        "notes"                 TEXT,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_stock_adjustments_number"
        ON "stock_adjustments"("business_id", "adjustment_number")
    `);

    // 2. stock_adjustment_items
    await queryRunner.query(`
      CREATE TABLE "stock_adjustment_items" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "adjustment_id"     UUID NOT NULL REFERENCES "stock_adjustments"("id") ON DELETE CASCADE,
        "product_id"        UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "variant_id"        UUID REFERENCES "product_variants"("id") ON DELETE RESTRICT,
        "batch_id"          UUID NOT NULL REFERENCES "stock_batches"("id") ON DELETE RESTRICT,
        "proposed_delta"    NUMERIC(12,3) NOT NULL,
        "current_quantity"  NUMERIC(12,3) NOT NULL,
        "notes"             VARCHAR(500)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_adjustment_items_adjustment"
        ON "stock_adjustment_items"("adjustment_id")
    `);

    // 3. stock_transfers
    await queryRunner.query(`
      CREATE TABLE "stock_transfers" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"           UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "transfer_number"       VARCHAR(50) NOT NULL,
        "source_warehouse_id"   UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "target_warehouse_id"   UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "status"                VARCHAR(20) NOT NULL DEFAULT 'draft',
        "notes"                 TEXT,
        "created_by_user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "posted_at"             TIMESTAMPTZ,
        "posted_by_user_id"     UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_stock_transfers_number"
        ON "stock_transfers"("business_id", "transfer_number")
    `);

    // 4. stock_transfer_items
    await queryRunner.query(`
      CREATE TABLE "stock_transfer_items" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "transfer_id"   UUID NOT NULL REFERENCES "stock_transfers"("id") ON DELETE CASCADE,
        "product_id"    UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "variant_id"    UUID REFERENCES "product_variants"("id") ON DELETE RESTRICT,
        "batch_id"      UUID NOT NULL REFERENCES "stock_batches"("id") ON DELETE RESTRICT,
        "quantity"      NUMERIC(12,3) NOT NULL,
        "notes"         VARCHAR(500)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_transfer_items_transfer"
        ON "stock_transfer_items"("transfer_id")
    `);

    // 5. Feature flag: stock_adjustment_approval — disabled for all business types
    await queryRunner.query(`
      INSERT INTO business_type_features (id, business_type_id, feature_key, is_enabled)
      SELECT gen_random_uuid(), id, 'stock_adjustment_approval', false FROM business_types
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM business_type_features WHERE feature_key = 'stock_adjustment_approval'`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_transfer_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_transfers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_adjustment_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_adjustments"`);
  }
}
```

- [ ] **Step 2: Verify the migration runs cleanly**

```bash
docker compose exec backend npm run migration:run --workspace=apps/backend
```

Expected: migration applied with no errors; `\dt` in psql shows the 4 new tables.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/migrations/1714011000000-AddStockTransfersAndAdjustments.ts
git commit -m "phase-12b: migration AddStockTransfersAndAdjustments — 4 tables + feature flag (EXT-INV-010, EXT-INV-020)"
```

---

## Task 2: Entities and Barrel Update

**Files:**
- Create: `apps/backend/src/common/entities/stock-adjustment.entity.ts`
- Create: `apps/backend/src/common/entities/stock-adjustment-item.entity.ts`
- Create: `apps/backend/src/common/entities/stock-transfer.entity.ts`
- Create: `apps/backend/src/common/entities/stock-transfer-item.entity.ts`
- Modify: `apps/backend/src/common/entities/index.ts`

- [ ] **Step 1: Create StockAdjustment entity**

```typescript
// apps/backend/src/common/entities/stock-adjustment.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';
import { StockAdjustmentItem } from './stock-adjustment-item.entity';

@Entity('stock_adjustments')
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 50 })
  adjustment_number: string;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid' })
  proposed_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'proposed_by_user_id' })
  proposedBy: User;

  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  posted_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejected_reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => StockAdjustmentItem, (i) => i.adjustment, { cascade: true })
  items: StockAdjustmentItem[];
}
```

- [ ] **Step 2: Create StockAdjustmentItem entity**

```typescript
// apps/backend/src/common/entities/stock-adjustment-item.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { StockAdjustment } from './stock-adjustment.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { StockBatch } from './stock-batch.entity';

@Entity('stock_adjustment_items')
export class StockAdjustmentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  adjustment_id: string;

  @ManyToOne(() => StockAdjustment, (a) => a.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adjustment_id' })
  adjustment: StockAdjustment;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string | null;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;

  @Column({ type: 'uuid' })
  batch_id: string;

  @ManyToOne(() => StockBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: StockBatch;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  proposed_delta: number;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  current_quantity: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;
}
```

- [ ] **Step 3: Create StockTransfer entity**

```typescript
// apps/backend/src/common/entities/stock-transfer.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';
import { StockTransferItem } from './stock-transfer-item.entity';

@Entity('stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 50 })
  transfer_number: string;

  @Column({ type: 'uuid' })
  source_warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'source_warehouse_id' })
  sourceWarehouse: Warehouse;

  @Column({ type: 'uuid' })
  target_warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'target_warehouse_id' })
  targetWarehouse: Warehouse;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ type: 'timestamptz', nullable: true })
  posted_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  posted_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'posted_by_user_id' })
  postedBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => StockTransferItem, (i) => i.transfer, { cascade: true })
  items: StockTransferItem[];
}
```

- [ ] **Step 4: Create StockTransferItem entity**

```typescript
// apps/backend/src/common/entities/stock-transfer-item.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { StockTransfer } from './stock-transfer.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { StockBatch } from './stock-batch.entity';

@Entity('stock_transfer_items')
export class StockTransferItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transfer_id: string;

  @ManyToOne(() => StockTransfer, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer: StockTransfer;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string | null;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;

  @Column({ type: 'uuid' })
  batch_id: string;

  @ManyToOne(() => StockBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: StockBatch;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;
}
```

- [ ] **Step 5: Add barrel exports in index.ts**

Add these four lines to `apps/backend/src/common/entities/index.ts` after the last `StockDiscrepancyAlert` export:

```typescript
export { StockAdjustment } from './stock-adjustment.entity';
export { StockAdjustmentItem } from './stock-adjustment-item.entity';
export { StockTransfer } from './stock-transfer.entity';
export { StockTransferItem } from './stock-transfer-item.entity';
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/common/entities/stock-adjustment.entity.ts \
        apps/backend/src/common/entities/stock-adjustment-item.entity.ts \
        apps/backend/src/common/entities/stock-transfer.entity.ts \
        apps/backend/src/common/entities/stock-transfer-item.entity.ts \
        apps/backend/src/common/entities/index.ts
git commit -m "phase-12b: 4 new entities StockAdjustment/Item, StockTransfer/Item (EXT-INV-010, EXT-INV-020)"
```

---

## Task 3: DTOs

**Files:**
- Create: `apps/backend/src/modules/inventory/dto/stock-adjustment-transfer.dto.ts`

- [ ] **Step 1: Create DTO file**

```typescript
// apps/backend/src/modules/inventory/dto/stock-adjustment-transfer.dto.ts
import {
  IsString, IsOptional, IsNumber, IsUUID, IsInt, IsIn,
  IsNotEmpty, ValidateNested, MinLength, Min, ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ── Stock Adjustment DTOs ──────────────────────────────────────────────────────

export class StockAdjustmentItemDto {
  @IsUUID() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsUUID() batch_id: string;
  @IsNumber() proposed_delta: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateAdjustmentDto {
  @IsUUID() warehouse_id: string;
  @IsString() @MinLength(10) reason: string;
  @IsOptional() @IsString() notes?: string;
  @ValidateNested({ each: true })
  @Type(() => StockAdjustmentItemDto)
  @ArrayMinSize(1)
  items: StockAdjustmentItemDto[];
}

export class RejectAdjustmentDto {
  @IsString() @IsNotEmpty() reason: string;
}

export class ListAdjustmentsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsIn(['draft', 'pending_approval', 'approved', 'posted', 'rejected']) status?: string;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsString() from_date?: string;
  @IsOptional() @IsString() to_date?: string;
}

// ── Stock Transfer DTOs ────────────────────────────────────────────────────────

export class StockTransferItemDto {
  @IsUUID() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsUUID() batch_id: string;
  @IsNumber() @Min(0.001) quantity: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateTransferDto {
  @IsUUID() source_warehouse_id: string;
  @IsUUID() target_warehouse_id: string;
  @IsOptional() @IsString() notes?: string;
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  @ArrayMinSize(1)
  items: StockTransferItemDto[];
}

export class ListTransfersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsIn(['draft', 'posted', 'cancelled']) status?: string;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsString() from_date?: string;
  @IsOptional() @IsString() to_date?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/inventory/dto/stock-adjustment-transfer.dto.ts
git commit -m "phase-12b: DTOs for stock adjustments and transfers"
```

---

## Task 4: Extend StockBatchService

**Files:**
- Modify: `apps/backend/src/modules/inventory/stock-batch.service.ts`

Two changes:
1. Add feature-flag gate at the top of `adjustBatch()` — existing tests are unaffected because `dataSource.query` is already mocked to return `undefined` in those tests, and `undefined?.[0]?.is_enabled` is falsy.
2. Add two new public methods (`applyBatchAdjustmentInQr`, `executeBatchTransferInQr`) used by the new services.

- [ ] **Step 1: Add feature-flag check to adjustBatch() and add two public methods**

Open `apps/backend/src/modules/inventory/stock-batch.service.ts`.

Add `QueryRunner` to the TypeORM import at line 5:

```typescript
import { Repository, DataSource, QueryRunner } from 'typeorm';
```

Prepend the feature-flag check to `adjustBatch()` (insert before the `batchRepo.findOne` call):

```typescript
async adjustBatch(batchId: string, businessId: string, userId: string, dto: AdjustBatchDto) {
  // Feature-flag gate: when stock_adjustment_approval is enabled, direct adjustments are blocked
  const flagRows = await this.dataSource.query(
    `SELECT btf.is_enabled
     FROM business_type_features btf
     JOIN businesses b ON b.business_type_id = btf.business_type_id
     WHERE b.id = $1 AND btf.feature_key = 'stock_adjustment_approval'
     LIMIT 1`,
    [businessId],
  );
  if (flagRows?.[0]?.is_enabled === true) {
    throw new UnprocessableEntityException({
      error: 'ADJUSTMENT_APPROVAL_REQUIRED',
      message: 'Stock adjustments require approval when stock_adjustment_approval is enabled. Use POST /api/business/stock-adjustments to create a proposal.',
    });
  }

  const batch = await this.batchRepo.findOne({ where: { id: batchId, business_id: businessId } });
  if (!batch) throw new NotFoundException('Batch not found');
  // ... rest unchanged
```

Then append two new methods at the bottom of the class (before the closing `}`):

```typescript
  // ── Shared: apply adjustment inside a caller's QueryRunner (EXT-INV-015) ────

  async applyBatchAdjustmentInQr(
    qr: QueryRunner,
    batchId: string,
    businessId: string,
    delta: number,
    userId: string,
    notes: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<void> {
    await qr.manager.query(
      `UPDATE stock_batches SET quantity_remaining = quantity_remaining + $1, updated_at = now() WHERE id = $2`,
      [delta, batchId],
    );
    const movement = qr.manager.create(StockMovement, {
      business_id: businessId,
      batch_id: batchId,
      movement_type: 'adjustment',
      quantity: delta,
      source_origin: 'realtime',
      performed_by_user_id: userId,
      notes,
      reference_type: referenceType ?? null,
      reference_id: referenceId ?? null,
    });
    await qr.manager.save(StockMovement, movement);
  }

  // ── Shared: execute a single-batch transfer inside a caller's QueryRunner (EXT-INV-023) ──

  async executeBatchTransferInQr(
    qr: QueryRunner,
    sourceBatchId: string,
    businessId: string,
    targetWarehouseId: string,
    quantity: number,
    userId: string,
    notes?: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<StockBatch> {
    const sourceBatch = await qr.manager.findOne(StockBatch, { where: { id: sourceBatchId } });
    if (!sourceBatch) throw new NotFoundException('Source batch not found');
    if (quantity > Number(sourceBatch.quantity_remaining)) {
      throw new UnprocessableEntityException(`Transfer quantity ${quantity} exceeds available ${sourceBatch.quantity_remaining}`);
    }

    // a) Decrement source
    await qr.manager.query(
      `UPDATE stock_batches SET quantity_remaining = quantity_remaining - $1, updated_at = now() WHERE id = $2`,
      [quantity, sourceBatchId],
    );

    // b) New batch at target warehouse
    const newBatch = qr.manager.create(StockBatch, {
      business_id: businessId,
      warehouse_id: targetWarehouseId,
      product_id: sourceBatch.product_id,
      variant_id: sourceBatch.variant_id,
      batch_code: sourceBatch.batch_code,
      quantity_initial: quantity,
      quantity_remaining: quantity,
      unit_cost: sourceBatch.unit_cost,
      unit_cost_tva_rate: sourceBatch.unit_cost_tva_rate,
      unit_of_measure: sourceBatch.unit_of_measure,
      expires_at: sourceBatch.expires_at,
      vendor_id: sourceBatch.vendor_id,
      purchase_order_id: null,
    });
    const savedNewBatch = await qr.manager.save(StockBatch, newBatch);

    // c) Transfer-out movement on source
    await qr.manager.save(StockMovement, qr.manager.create(StockMovement, {
      business_id: businessId,
      batch_id: sourceBatchId,
      movement_type: 'transfer_out',
      quantity,
      source_origin: 'realtime',
      performed_by_user_id: userId,
      notes: notes ?? null,
      reference_type: referenceType ?? null,
      reference_id: referenceId ?? null,
    }));

    // d) Transfer-in movement on new batch
    await qr.manager.save(StockMovement, qr.manager.create(StockMovement, {
      business_id: businessId,
      batch_id: savedNewBatch.id,
      movement_type: 'transfer_in',
      quantity,
      source_origin: 'realtime',
      performed_by_user_id: userId,
      notes: notes ?? null,
      reference_type: referenceType ?? null,
      reference_id: referenceId ?? null,
    }));

    return savedNewBatch;
  }
```

- [ ] **Step 2: Run existing tests to confirm they still pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern=stock-batch.service
```

Expected: all 8 tests in `stock-batch.service.spec.ts` pass.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/inventory/stock-batch.service.ts
git commit -m "phase-12b: StockBatchService — feature-flag gate on INV-042, add applyBatchAdjustmentInQr + executeBatchTransferInQr (EXT-INV-015, EXT-INV-023)"
```

---

## Task 5: StockAdjustmentService

**Files:**
- Create: `apps/backend/src/modules/inventory/stock-adjustment.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// apps/backend/src/modules/inventory/stock-adjustment.service.ts
import {
  Injectable, NotFoundException, UnprocessableEntityException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockAdjustment } from '../../common/entities/stock-adjustment.entity';
import { StockAdjustmentItem } from '../../common/entities/stock-adjustment-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { StockBatchService } from './stock-batch.service';
import {
  CreateAdjustmentDto,
  RejectAdjustmentDto,
  ListAdjustmentsQueryDto,
} from './dto/stock-adjustment-transfer.dto';

@Injectable()
export class StockAdjustmentService {
  constructor(
    @InjectRepository(StockAdjustment) private adjRepo: Repository<StockAdjustment>,
    @InjectRepository(StockAdjustmentItem) private adjItemRepo: Repository<StockAdjustmentItem>,
    @InjectRepository(StockBatch) private batchRepo: Repository<StockBatch>,
    private stockBatchService: StockBatchService,
    private dataSource: DataSource,
  ) {}

  private async generateAdjNumber(businessId: string, qr: any): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await qr.query(
      `SELECT COUNT(*)::int AS cnt FROM stock_adjustments WHERE business_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [businessId, year],
    );
    return `ADJ-${year}-${String((row.cnt ?? 0) + 1).padStart(5, '0')}`;
  }

  // ── EXT-INV-010: List adjustments ──────────────────────────────────────────

  async listAdjustments(businessId: string, query: ListAdjustmentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.adjRepo
      .createQueryBuilder('a')
      .where('a.business_id = :businessId', { businessId })
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.warehouse_id) qb.andWhere('a.warehouse_id = :wh', { wh: query.warehouse_id });
    if (query.from_date) qb.andWhere('a.created_at >= :from', { from: query.from_date });
    if (query.to_date) qb.andWhere('a.created_at <= :to', { to: query.to_date });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // ── EXT-INV-011: Get adjustment detail ─────────────────────────────────────

  async getAdjustment(id: string, businessId: string) {
    const adj = await this.adjRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    return adj;
  }

  // ── EXT-INV-012: Create draft adjustment ───────────────────────────────────

  async createAdjustment(businessId: string, userId: string, dto: CreateAdjustmentDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const adjNumber = await this.generateAdjNumber(businessId, qr);

      const adj = qr.manager.create(StockAdjustment, {
        business_id: businessId,
        adjustment_number: adjNumber,
        warehouse_id: dto.warehouse_id,
        status: 'draft',
        reason: dto.reason,
        proposed_by_user_id: userId,
        notes: dto.notes ?? null,
      });
      const savedAdj = await qr.manager.save(StockAdjustment, adj);

      const items: StockAdjustmentItem[] = [];
      for (const itemDto of dto.items) {
        const batch = await qr.manager.findOne(StockBatch, {
          where: { id: itemDto.batch_id, business_id: businessId },
        });
        if (!batch) throw new NotFoundException(`Batch ${itemDto.batch_id} not found`);

        items.push(qr.manager.create(StockAdjustmentItem, {
          adjustment_id: savedAdj.id,
          product_id: itemDto.product_id,
          variant_id: itemDto.variant_id ?? null,
          batch_id: itemDto.batch_id,
          proposed_delta: itemDto.proposed_delta,
          current_quantity: Number(batch.quantity_remaining),
          notes: itemDto.notes ?? null,
        }));
      }
      await qr.manager.save(StockAdjustmentItem, items);

      await qr.commitTransaction();
      return this.adjRepo.findOne({ where: { id: savedAdj.id }, relations: ['items'] });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── EXT-INV-013: Submit (draft → pending_approval) ─────────────────────────

  async submitAdjustment(id: string, businessId: string) {
    const adj = await this.adjRepo.findOne({ where: { id, business_id: businessId } });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    if (adj.status !== 'draft') {
      throw new UnprocessableEntityException('Only draft adjustments can be submitted');
    }
    await this.adjRepo.update(id, { status: 'pending_approval' });
    return this.adjRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // ── EXT-INV-014: Approve (pending_approval → approved) ─────────────────────

  async approveAdjustment(id: string, businessId: string, userId: string) {
    const adj = await this.adjRepo.findOne({ where: { id, business_id: businessId } });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    if (adj.status !== 'pending_approval') {
      throw new UnprocessableEntityException('Only pending_approval adjustments can be approved');
    }
    await this.adjRepo.update(id, {
      status: 'approved',
      approved_by_user_id: userId,
      approved_at: new Date(),
    });
    return this.adjRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // ── EXT-INV-015: Post (approved → posted, applies deltas) ──────────────────

  async postAdjustment(id: string, businessId: string, userId: string) {
    const adj = await this.adjRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    if (adj.status !== 'approved') {
      throw new UnprocessableEntityException('Only approved adjustments can be posted');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      for (const item of adj.items) {
        await this.stockBatchService.applyBatchAdjustmentInQr(
          qr,
          item.batch_id,
          businessId,
          Number(item.proposed_delta),
          userId,
          adj.reason,
          'stock_adjustment',
          adj.id,
        );
      }
      await qr.manager.update(StockAdjustment, id, {
        status: 'posted',
        posted_at: new Date(),
      });
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return this.adjRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // ── EXT-INV-016: Reject (pending_approval → rejected) ──────────────────────

  async rejectAdjustment(id: string, businessId: string, dto: RejectAdjustmentDto) {
    const adj = await this.adjRepo.findOne({ where: { id, business_id: businessId } });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    if (adj.status !== 'pending_approval') {
      throw new UnprocessableEntityException('Only pending_approval adjustments can be rejected');
    }
    await this.adjRepo.update(id, {
      status: 'rejected',
      rejected_reason: dto.reason,
    });
    return this.adjRepo.findOne({ where: { id }, relations: ['items'] });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/inventory/stock-adjustment.service.ts
git commit -m "phase-12b: StockAdjustmentService — list/detail/create/submit/approve/post/reject (EXT-INV-010–016)"
```

---

## Task 6: StockAdjustmentController

**Files:**
- Create: `apps/backend/src/modules/inventory/stock-adjustment.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
// apps/backend/src/modules/inventory/stock-adjustment.controller.ts
import {
  Controller, Get, Post, Param, Body, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { StockAdjustmentService } from './stock-adjustment.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { userHasPermission } from '../../common/utils/permissions';
import {
  CreateAdjustmentDto,
  RejectAdjustmentDto,
  ListAdjustmentsQueryDto,
} from './dto/stock-adjustment-transfer.dto';

@Controller('business/stock-adjustments')
@UseGuards(RolesGuard)
export class StockAdjustmentController {
  constructor(private readonly adjService: StockAdjustmentService) {}

  // EXT-INV-010: List
  @Get()
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListAdjustmentsQueryDto,
  ) {
    return this.adjService.listAdjustments(businessId, query);
  }

  // EXT-INV-011: Detail
  @Get(':id')
  detail(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.adjService.getAdjustment(id, businessId);
  }

  // EXT-INV-012: Create draft — requires can_propose_stock_adjustment
  @Post()
  create(
    @CurrentUser() user: any,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateAdjustmentDto,
  ) {
    if (!userHasPermission(user, 'can_propose_stock_adjustment')) {
      throw new ForbiddenException('can_propose_stock_adjustment permission required');
    }
    return this.adjService.createAdjustment(businessId, user.id, dto);
  }

  // EXT-INV-013: Submit (draft → pending_approval)
  @Post(':id/submit')
  submit(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.adjService.submitAdjustment(id, businessId);
  }

  // EXT-INV-014: Approve — owner/manager + can_approve_stock_adjustment
  @Post(':id/approve')
  @Roles('owner', 'manager')
  approve(
    @CurrentUser() user: any,
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    if (!userHasPermission(user, 'can_approve_stock_adjustment')) {
      throw new ForbiddenException('can_approve_stock_adjustment permission required');
    }
    return this.adjService.approveAdjustment(id, businessId, user.id);
  }

  // EXT-INV-015: Post (approved → posted)
  @Post(':id/post')
  @Roles('owner', 'manager')
  post(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.adjService.postAdjustment(id, businessId, userId);
  }

  // EXT-INV-016: Reject — owner/manager + can_approve_stock_adjustment
  @Post(':id/reject')
  @Roles('owner', 'manager')
  reject(
    @CurrentUser() user: any,
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: RejectAdjustmentDto,
  ) {
    if (!userHasPermission(user, 'can_approve_stock_adjustment')) {
      throw new ForbiddenException('can_approve_stock_adjustment permission required');
    }
    return this.adjService.rejectAdjustment(id, businessId, dto);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/inventory/stock-adjustment.controller.ts
git commit -m "phase-12b: StockAdjustmentController — 7 endpoints (EXT-INV-010–016)"
```

---

## Task 7: StockTransferService

**Files:**
- Create: `apps/backend/src/modules/inventory/stock-transfer.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// apps/backend/src/modules/inventory/stock-transfer.service.ts
import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockTransfer } from '../../common/entities/stock-transfer.entity';
import { StockTransferItem } from '../../common/entities/stock-transfer-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { StockBatchService } from './stock-batch.service';
import {
  CreateTransferDto,
  ListTransfersQueryDto,
} from './dto/stock-adjustment-transfer.dto';

@Injectable()
export class StockTransferService {
  constructor(
    @InjectRepository(StockTransfer) private transferRepo: Repository<StockTransfer>,
    @InjectRepository(StockTransferItem) private transferItemRepo: Repository<StockTransferItem>,
    @InjectRepository(StockBatch) private batchRepo: Repository<StockBatch>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    private stockBatchService: StockBatchService,
    private dataSource: DataSource,
  ) {}

  private async generateTrfNumber(businessId: string, qr: any): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await qr.query(
      `SELECT COUNT(*)::int AS cnt FROM stock_transfers WHERE business_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [businessId, year],
    );
    return `TRF-${year}-${String((row.cnt ?? 0) + 1).padStart(5, '0')}`;
  }

  // ── EXT-INV-020: List transfers ─────────────────────────────────────────────

  async listTransfers(businessId: string, query: ListTransfersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.transferRepo
      .createQueryBuilder('t')
      .where('t.business_id = :businessId', { businessId })
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.warehouse_id) {
      qb.andWhere(
        '(t.source_warehouse_id = :wh OR t.target_warehouse_id = :wh)',
        { wh: query.warehouse_id },
      );
    }
    if (query.from_date) qb.andWhere('t.created_at >= :from', { from: query.from_date });
    if (query.to_date) qb.andWhere('t.created_at <= :to', { to: query.to_date });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // ── EXT-INV-021: Get transfer detail ────────────────────────────────────────

  async getTransfer(id: string, businessId: string) {
    const transfer = await this.transferRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    return transfer;
  }

  // ── EXT-INV-022: Create draft transfer ──────────────────────────────────────

  async createTransfer(businessId: string, userId: string, dto: CreateTransferDto) {
    if (dto.source_warehouse_id === dto.target_warehouse_id) {
      throw new UnprocessableEntityException('Source and target warehouses must be different');
    }

    const sourceWh = await this.warehouseRepo.findOne({
      where: { id: dto.source_warehouse_id, business_id: businessId },
    });
    if (!sourceWh) throw new NotFoundException('Source warehouse not found');

    const targetWh = await this.warehouseRepo.findOne({
      where: { id: dto.target_warehouse_id, business_id: businessId },
    });
    if (!targetWh) throw new NotFoundException('Target warehouse not found');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const trfNumber = await this.generateTrfNumber(businessId, qr);

      const transfer = qr.manager.create(StockTransfer, {
        business_id: businessId,
        transfer_number: trfNumber,
        source_warehouse_id: dto.source_warehouse_id,
        target_warehouse_id: dto.target_warehouse_id,
        status: 'draft',
        notes: dto.notes ?? null,
        created_by_user_id: userId,
      });
      const savedTransfer = await qr.manager.save(StockTransfer, transfer);

      const items: StockTransferItem[] = [];
      for (const itemDto of dto.items) {
        const batch = await qr.manager.findOne(StockBatch, {
          where: { id: itemDto.batch_id, business_id: businessId, warehouse_id: dto.source_warehouse_id },
        });
        if (!batch) {
          throw new UnprocessableEntityException(
            `Batch ${itemDto.batch_id} not found in source warehouse`,
          );
        }
        items.push(qr.manager.create(StockTransferItem, {
          transfer_id: savedTransfer.id,
          product_id: itemDto.product_id,
          variant_id: itemDto.variant_id ?? null,
          batch_id: itemDto.batch_id,
          quantity: itemDto.quantity,
          notes: itemDto.notes ?? null,
        }));
      }
      await qr.manager.save(StockTransferItem, items);

      await qr.commitTransaction();
      return this.transferRepo.findOne({ where: { id: savedTransfer.id }, relations: ['items'] });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── EXT-INV-023: Post transfer (draft → posted) ──────────────────────────────

  async postTransfer(id: string, businessId: string, userId: string) {
    const transfer = await this.transferRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    if (transfer.status !== 'draft') {
      throw new UnprocessableEntityException('Only draft transfers can be posted');
    }
    if (!transfer.items?.length) {
      throw new UnprocessableEntityException('Transfer has no items');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      for (const item of transfer.items) {
        await this.stockBatchService.executeBatchTransferInQr(
          qr,
          item.batch_id,
          businessId,
          transfer.target_warehouse_id,
          Number(item.quantity),
          userId,
          transfer.notes ?? undefined,
          'stock_transfer',
          transfer.id,
        );
      }
      await qr.manager.update(StockTransfer, id, {
        status: 'posted',
        posted_at: new Date(),
        posted_by_user_id: userId,
      });
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return this.transferRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // ── EXT-INV-024: Cancel transfer (draft → cancelled) ─────────────────────────

  async cancelTransfer(id: string, businessId: string) {
    const transfer = await this.transferRepo.findOne({ where: { id, business_id: businessId } });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    if (transfer.status !== 'draft') {
      throw new UnprocessableEntityException('Only draft transfers can be cancelled');
    }
    await this.transferRepo.update(id, { status: 'cancelled' });
    return this.transferRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // ── EXT-INV-025: Delete draft transfer ───────────────────────────────────────

  async deleteTransfer(id: string, businessId: string) {
    const transfer = await this.transferRepo.findOne({ where: { id, business_id: businessId } });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    if (transfer.status !== 'draft') {
      throw new UnprocessableEntityException('Only draft transfers can be deleted');
    }
    await this.transferRepo.delete(id);
    return { deleted: true };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/inventory/stock-transfer.service.ts
git commit -m "phase-12b: StockTransferService — list/detail/create/post/cancel/delete (EXT-INV-020–025)"
```

---

## Task 8: StockTransferController

**Files:**
- Create: `apps/backend/src/modules/inventory/stock-transfer.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
// apps/backend/src/modules/inventory/stock-transfer.controller.ts
import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { StockTransferService } from './stock-transfer.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateTransferDto,
  ListTransfersQueryDto,
} from './dto/stock-adjustment-transfer.dto';

@Controller('business/stock-transfers')
@UseGuards(RolesGuard)
@Roles('owner', 'manager')
export class StockTransferController {
  constructor(private readonly transferService: StockTransferService) {}

  // EXT-INV-020: List
  @Get()
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListTransfersQueryDto,
  ) {
    return this.transferService.listTransfers(businessId, query);
  }

  // EXT-INV-021: Detail
  @Get(':id')
  detail(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.transferService.getTransfer(id, businessId);
  }

  // EXT-INV-022: Create draft
  @Post()
  create(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transferService.createTransfer(businessId, userId, dto);
  }

  // EXT-INV-023: Post (immutable after this point)
  @Post(':id/post')
  post(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.transferService.postTransfer(id, businessId, userId);
  }

  // EXT-INV-024: Cancel draft
  @Post(':id/cancel')
  cancel(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.transferService.cancelTransfer(id, businessId);
  }

  // EXT-INV-025: Delete draft
  @Delete(':id')
  remove(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.transferService.deleteTransfer(id, businessId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/inventory/stock-transfer.controller.ts
git commit -m "phase-12b: StockTransferController — 6 endpoints (EXT-INV-020–025)"
```

---

## Task 9: Update InventoryModule

**Files:**
- Modify: `apps/backend/src/modules/inventory/inventory.module.ts`

- [ ] **Step 1: Register new entities, services, and controllers**

The modified `inventory.module.ts` should add:
- Imports: `StockAdjustment`, `StockAdjustmentItem`, `StockTransfer`, `StockTransferItem` to `TypeOrmModule.forFeature`
- Controllers: `StockAdjustmentController`, `StockTransferController`
- Providers: `StockAdjustmentService`, `StockTransferService`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockBatchService } from './stock-batch.service';
import { StockBatchController } from './stock-batch.controller';
import { StockTemplateService } from './stock-template.service';
import { StockTemplateController } from './stock-template.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { StockConsumptionService } from './stock-consumption.service';
import { StockSchedulerService } from './stock-scheduler.service';
import { StockAdjustmentService } from './stock-adjustment.service';
import { StockAdjustmentController } from './stock-adjustment.controller';
import { StockTransferService } from './stock-transfer.service';
import { StockTransferController } from './stock-transfer.controller';
import { ExpirationScanProcessor, EXPIRATION_SCAN_QUEUE } from './processors/expiration-scan.processor';
import { ReconciliationProcessor, RECONCILIATION_QUEUE } from './processors/reconciliation.processor';
import { UnitOfMeasure } from '../../common/entities/unit-of-measure.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { VendorCheckDetail } from '../../common/entities/vendor-check-detail.entity';
import { Brand } from '../../common/entities/brand.entity';
import { NutritionInfo } from '../../common/entities/nutrition-info.entity';
import { Product } from '../../common/entities/product.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { StockMovement } from '../../common/entities/stock-movement.entity';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../common/entities/purchase-order-item.entity';
import { StockTemplate } from '../../common/entities/stock-template.entity';
import { StockTemplateItem } from '../../common/entities/stock-template-item.entity';
import { ExpirationAlert } from '../../common/entities/expiration-alert.entity';
import { StockDiscrepancyAlert } from '../../common/entities/stock-discrepancy-alert.entity';
import { StockAdjustment } from '../../common/entities/stock-adjustment.entity';
import { StockAdjustmentItem } from '../../common/entities/stock-adjustment-item.entity';
import { StockTransfer } from '../../common/entities/stock-transfer.entity';
import { StockTransferItem } from '../../common/entities/stock-transfer-item.entity';
import { Business } from '../../common/entities/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnitOfMeasure,
      Warehouse,
      Vendor,
      VendorCheckDetail,
      Brand,
      NutritionInfo,
      Product,
      StockBatch,
      StockMovement,
      PurchaseOrder,
      PurchaseOrderItem,
      StockTemplate,
      StockTemplateItem,
      ExpirationAlert,
      StockDiscrepancyAlert,
      StockAdjustment,
      StockAdjustmentItem,
      StockTransfer,
      StockTransferItem,
      Business,
    ]),
    BullModule.registerQueue(
      { name: EXPIRATION_SCAN_QUEUE },
      { name: RECONCILIATION_QUEUE },
    ),
  ],
  controllers: [
    InventoryController,
    StockBatchController,
    StockTemplateController,
    PurchaseOrderController,
    AlertController,
    StockAdjustmentController,
    StockTransferController,
  ],
  providers: [
    InventoryService,
    StockBatchService,
    StockTemplateService,
    PurchaseOrderService,
    AlertService,
    StockConsumptionService,
    StockSchedulerService,
    StockAdjustmentService,
    StockTransferService,
    ExpirationScanProcessor,
    ReconciliationProcessor,
  ],
  exports: [
    InventoryService,
    StockConsumptionService,
  ],
})
export class InventoryModule {}
```

- [ ] **Step 2: Run the full test suite to verify no regressions**

```bash
docker compose exec backend npm test --workspace=apps/backend
```

Expected: all 497 existing tests still pass. The backend compiles and starts cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/inventory/inventory.module.ts
git commit -m "phase-12b: register StockAdjustment/Transfer services and controllers in InventoryModule"
```

---

## Task 10: Tests — StockAdjustmentService

**Files:**
- Create: `apps/backend/src/modules/inventory/stock-adjustment.service.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
// apps/backend/src/modules/inventory/stock-adjustment.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockAdjustmentService } from './stock-adjustment.service';
import { StockBatchService } from './stock-batch.service';
import { StockAdjustment } from '../../common/entities/stock-adjustment.entity';
import { StockAdjustmentItem } from '../../common/entities/stock-adjustment-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const USER_ID = 'user-1';
const ADJ_ID = 'adj-1';
const BATCH_ID = 'batch-1';
const WH_ID = 'wh-1';

function makeAdj(overrides: Partial<StockAdjustment> = {}): StockAdjustment {
  return {
    id: ADJ_ID,
    business_id: BIZ,
    adjustment_number: 'ADJ-2026-00001',
    warehouse_id: WH_ID,
    status: 'draft',
    reason: 'inventory count correction',
    proposed_by_user_id: USER_ID,
    approved_by_user_id: null,
    approved_at: null,
    posted_at: null,
    rejected_reason: null,
    notes: null,
    created_at: new Date(),
    items: [],
    ...overrides,
  } as StockAdjustment;
}

function makeBatch(): StockBatch {
  return { id: BATCH_ID, business_id: BIZ, quantity_remaining: 50 } as StockBatch;
}

describe('StockAdjustmentService', () => {
  let service: StockAdjustmentService;
  let adjRepo: jest.Mocked<any>;
  let adjItemRepo: jest.Mocked<any>;
  let batchRepo: jest.Mocked<any>;
  let stockBatchService: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  const mockQr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    adjRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    adjItemRepo = {};
    batchRepo = { findOne: jest.fn() };
    stockBatchService = { applyBatchAdjustmentInQr: jest.fn() };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(mockQr) };

    const module = await Test.createTestingModule({
      providers: [
        StockAdjustmentService,
        { provide: getRepositoryToken(StockAdjustment), useValue: adjRepo },
        { provide: getRepositoryToken(StockAdjustmentItem), useValue: adjItemRepo },
        { provide: getRepositoryToken(StockBatch), useValue: batchRepo },
        { provide: StockBatchService, useValue: stockBatchService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(StockAdjustmentService);

    Object.values(mockQr).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  describe('listAdjustments', () => {
    it('returns paginated adjustments for the business', async () => {
      const adj = makeAdj();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[adj], 1]),
      };
      adjRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listAdjustments(BIZ, {});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getAdjustment', () => {
    it('returns adjustment with items', async () => {
      const adj = makeAdj({ items: [] });
      adjRepo.findOne.mockResolvedValue(adj);
      const result = await service.getAdjustment(ADJ_ID, BIZ);
      expect(result.id).toBe(ADJ_ID);
    });

    it('throws 404 for cross-tenant access', async () => {
      adjRepo.findOne.mockResolvedValue(null);
      await expect(service.getAdjustment(ADJ_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAdjustment', () => {
    it('creates draft adjustment with items and snapshots current_quantity', async () => {
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      const savedAdj = makeAdj();
      mockQr.manager.create.mockReturnValueOnce({}).mockReturnValueOnce({});
      mockQr.manager.save.mockResolvedValueOnce(savedAdj).mockResolvedValueOnce([{}]);
      mockQr.manager.findOne.mockResolvedValue(makeBatch());
      adjRepo.findOne.mockResolvedValue({ ...savedAdj, items: [{}] });

      const dto = {
        warehouse_id: WH_ID,
        reason: 'inventory count correction',
        items: [{ product_id: 'prod-1', batch_id: BATCH_ID, proposed_delta: -5 }],
      };
      const result = await service.createAdjustment(BIZ, USER_ID, dto);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws 404 if batch does not belong to business', async () => {
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(makeAdj());
      mockQr.manager.findOne.mockResolvedValue(null);

      await expect(
        service.createAdjustment(BIZ, USER_ID, {
          warehouse_id: WH_ID,
          reason: 'inventory count correction',
          items: [{ product_id: 'prod-1', batch_id: BATCH_ID, proposed_delta: -5 }],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('submitAdjustment', () => {
    it('transitions draft → pending_approval', async () => {
      adjRepo.findOne
        .mockResolvedValueOnce(makeAdj({ status: 'draft' }))
        .mockResolvedValueOnce(makeAdj({ status: 'pending_approval', items: [] }));
      adjRepo.update.mockResolvedValue(undefined);

      const result = await service.submitAdjustment(ADJ_ID, BIZ);
      expect(adjRepo.update).toHaveBeenCalledWith(ADJ_ID, { status: 'pending_approval' });
      expect(result?.status).toBe('pending_approval');
    });

    it('throws 422 if not draft', async () => {
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'pending_approval' }));
      await expect(service.submitAdjustment(ADJ_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      adjRepo.findOne.mockResolvedValue(null);
      await expect(service.submitAdjustment(ADJ_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveAdjustment', () => {
    it('transitions pending_approval → approved', async () => {
      adjRepo.findOne
        .mockResolvedValueOnce(makeAdj({ status: 'pending_approval' }))
        .mockResolvedValueOnce(makeAdj({ status: 'approved', items: [] }));
      adjRepo.update.mockResolvedValue(undefined);

      const result = await service.approveAdjustment(ADJ_ID, BIZ, USER_ID);
      expect(adjRepo.update).toHaveBeenCalledWith(ADJ_ID, expect.objectContaining({ status: 'approved' }));
      expect(result?.status).toBe('approved');
    });

    it('throws 422 if not pending_approval', async () => {
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'draft' }));
      await expect(service.approveAdjustment(ADJ_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('postAdjustment', () => {
    it('applies deltas via applyBatchAdjustmentInQr and sets status to posted', async () => {
      const item = { batch_id: BATCH_ID, proposed_delta: -5 };
      adjRepo.findOne
        .mockResolvedValueOnce(makeAdj({ status: 'approved', items: [item as any] }))
        .mockResolvedValueOnce(makeAdj({ status: 'posted', items: [item as any] }));
      stockBatchService.applyBatchAdjustmentInQr.mockResolvedValue(undefined);
      mockQr.manager.update.mockResolvedValue(undefined);

      const result = await service.postAdjustment(ADJ_ID, BIZ, USER_ID);
      expect(stockBatchService.applyBatchAdjustmentInQr).toHaveBeenCalledWith(
        mockQr, BATCH_ID, BIZ, -5, USER_ID, expect.any(String), 'stock_adjustment', ADJ_ID,
      );
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result?.status).toBe('posted');
    });

    it('throws 422 if not approved', async () => {
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'pending_approval', items: [] }));
      await expect(service.postAdjustment(ADJ_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('rolls back on applyBatchAdjustmentInQr failure', async () => {
      const item = { batch_id: BATCH_ID, proposed_delta: -5 };
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'approved', items: [item as any] }));
      stockBatchService.applyBatchAdjustmentInQr.mockRejectedValue(new Error('DB error'));

      await expect(service.postAdjustment(ADJ_ID, BIZ, USER_ID)).rejects.toThrow('DB error');
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('rejectAdjustment', () => {
    it('transitions pending_approval → rejected with reason', async () => {
      adjRepo.findOne
        .mockResolvedValueOnce(makeAdj({ status: 'pending_approval' }))
        .mockResolvedValueOnce(makeAdj({ status: 'rejected', rejected_reason: 'wrong count', items: [] }));
      adjRepo.update.mockResolvedValue(undefined);

      const result = await service.rejectAdjustment(ADJ_ID, BIZ, { reason: 'wrong count' });
      expect(adjRepo.update).toHaveBeenCalledWith(ADJ_ID, expect.objectContaining({ status: 'rejected' }));
      expect(result?.status).toBe('rejected');
    });

    it('throws 422 if not pending_approval', async () => {
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'approved' }));
      await expect(service.rejectAdjustment(ADJ_ID, BIZ, { reason: 'x' })).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern=stock-adjustment.service
```

Expected: all tests in this file pass.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/inventory/stock-adjustment.service.spec.ts
git commit -m "phase-12b: tests for StockAdjustmentService — 12 cases"
```

---

## Task 11: Tests — StockTransferService

**Files:**
- Create: `apps/backend/src/modules/inventory/stock-transfer.service.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
// apps/backend/src/modules/inventory/stock-transfer.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockTransferService } from './stock-transfer.service';
import { StockBatchService } from './stock-batch.service';
import { StockTransfer } from '../../common/entities/stock-transfer.entity';
import { StockTransferItem } from '../../common/entities/stock-transfer-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const USER_ID = 'user-1';
const TRF_ID = 'trf-1';
const BATCH_ID = 'batch-1';
const WH_SRC = 'wh-src';
const WH_TGT = 'wh-tgt';

function makeTransfer(overrides: Partial<StockTransfer> = {}): StockTransfer {
  return {
    id: TRF_ID,
    business_id: BIZ,
    transfer_number: 'TRF-2026-00001',
    source_warehouse_id: WH_SRC,
    target_warehouse_id: WH_TGT,
    status: 'draft',
    notes: null,
    created_by_user_id: USER_ID,
    posted_at: null,
    posted_by_user_id: null,
    created_at: new Date(),
    items: [],
    ...overrides,
  } as StockTransfer;
}

function makeWarehouse(id: string): Warehouse {
  return { id, business_id: BIZ } as Warehouse;
}

describe('StockTransferService', () => {
  let service: StockTransferService;
  let transferRepo: jest.Mocked<any>;
  let transferItemRepo: jest.Mocked<any>;
  let batchRepo: jest.Mocked<any>;
  let warehouseRepo: jest.Mocked<any>;
  let stockBatchService: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  const mockQr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    transferRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    transferItemRepo = {};
    batchRepo = {};
    warehouseRepo = { findOne: jest.fn() };
    stockBatchService = { executeBatchTransferInQr: jest.fn() };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(mockQr) };

    const module = await Test.createTestingModule({
      providers: [
        StockTransferService,
        { provide: getRepositoryToken(StockTransfer), useValue: transferRepo },
        { provide: getRepositoryToken(StockTransferItem), useValue: transferItemRepo },
        { provide: getRepositoryToken(StockBatch), useValue: batchRepo },
        { provide: getRepositoryToken(Warehouse), useValue: warehouseRepo },
        { provide: StockBatchService, useValue: stockBatchService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(StockTransferService);

    Object.values(mockQr).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  describe('listTransfers', () => {
    it('returns paginated transfers filtered by business_id', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[makeTransfer()], 1]),
      };
      transferRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listTransfers(BIZ, {});
      expect(result.total).toBe(1);
    });
  });

  describe('getTransfer', () => {
    it('returns transfer with items', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ items: [] }));
      const result = await service.getTransfer(TRF_ID, BIZ);
      expect(result.id).toBe(TRF_ID);
    });

    it('throws 404 for cross-tenant access', async () => {
      transferRepo.findOne.mockResolvedValue(null);
      await expect(service.getTransfer(TRF_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTransfer', () => {
    it('creates draft transfer with items', async () => {
      warehouseRepo.findOne
        .mockResolvedValueOnce(makeWarehouse(WH_SRC))
        .mockResolvedValueOnce(makeWarehouse(WH_TGT));
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      const savedTransfer = makeTransfer();
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(savedTransfer).mockResolvedValueOnce([{}]);
      mockQr.manager.findOne.mockResolvedValue({ id: BATCH_ID, quantity_remaining: 50 });
      transferRepo.findOne.mockResolvedValue({ ...savedTransfer, items: [{}] });

      const dto = {
        source_warehouse_id: WH_SRC,
        target_warehouse_id: WH_TGT,
        items: [{ product_id: 'prod-1', batch_id: BATCH_ID, quantity: 10 }],
      };
      const result = await service.createTransfer(BIZ, USER_ID, dto);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws 422 when source equals target warehouse', async () => {
      await expect(
        service.createTransfer(BIZ, USER_ID, {
          source_warehouse_id: WH_SRC,
          target_warehouse_id: WH_SRC,
          items: [{ product_id: 'prod-1', batch_id: BATCH_ID, quantity: 10 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 if source warehouse not found', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createTransfer(BIZ, USER_ID, {
          source_warehouse_id: WH_SRC,
          target_warehouse_id: WH_TGT,
          items: [{ product_id: 'prod-1', batch_id: BATCH_ID, quantity: 10 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 422 if batch does not belong to source warehouse', async () => {
      warehouseRepo.findOne
        .mockResolvedValueOnce(makeWarehouse(WH_SRC))
        .mockResolvedValueOnce(makeWarehouse(WH_TGT));
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(makeTransfer());
      mockQr.manager.findOne.mockResolvedValue(null); // batch not in source WH

      await expect(
        service.createTransfer(BIZ, USER_ID, {
          source_warehouse_id: WH_SRC,
          target_warehouse_id: WH_TGT,
          items: [{ product_id: 'prod-1', batch_id: BATCH_ID, quantity: 10 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('postTransfer', () => {
    it('calls executeBatchTransferInQr per item and sets status to posted', async () => {
      const item = { batch_id: BATCH_ID, quantity: 10 };
      transferRepo.findOne
        .mockResolvedValueOnce(makeTransfer({ status: 'draft', items: [item as any] }))
        .mockResolvedValueOnce(makeTransfer({ status: 'posted', items: [item as any] }));
      stockBatchService.executeBatchTransferInQr.mockResolvedValue({});
      mockQr.manager.update.mockResolvedValue(undefined);

      const result = await service.postTransfer(TRF_ID, BIZ, USER_ID);
      expect(stockBatchService.executeBatchTransferInQr).toHaveBeenCalledWith(
        mockQr, BATCH_ID, BIZ, WH_TGT, 10, USER_ID, null, 'stock_transfer', TRF_ID,
      );
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result?.status).toBe('posted');
    });

    it('throws 422 if not draft (immutability after post)', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'posted', items: [] }));
      await expect(service.postTransfer(TRF_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('rolls back on executeBatchTransferInQr failure', async () => {
      const item = { batch_id: BATCH_ID, quantity: 10 };
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'draft', items: [item as any] }));
      stockBatchService.executeBatchTransferInQr.mockRejectedValue(new Error('insufficient stock'));

      await expect(service.postTransfer(TRF_ID, BIZ, USER_ID)).rejects.toThrow('insufficient stock');
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('cancelTransfer', () => {
    it('sets status to cancelled', async () => {
      transferRepo.findOne
        .mockResolvedValueOnce(makeTransfer({ status: 'draft' }))
        .mockResolvedValueOnce(makeTransfer({ status: 'cancelled', items: [] }));
      transferRepo.update.mockResolvedValue(undefined);

      const result = await service.cancelTransfer(TRF_ID, BIZ);
      expect(transferRepo.update).toHaveBeenCalledWith(TRF_ID, { status: 'cancelled' });
      expect(result?.status).toBe('cancelled');
    });

    it('throws 422 if not draft', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'posted' }));
      await expect(service.cancelTransfer(TRF_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      transferRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelTransfer(TRF_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTransfer', () => {
    it('hard-deletes a draft transfer', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'draft' }));
      transferRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteTransfer(TRF_ID, BIZ);
      expect(transferRepo.delete).toHaveBeenCalledWith(TRF_ID);
      expect(result.deleted).toBe(true);
    });

    it('throws 422 if not draft', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'cancelled' }));
      await expect(service.deleteTransfer(TRF_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern=stock-transfer.service
```

Expected: all tests in this file pass.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/inventory/stock-transfer.service.spec.ts
git commit -m "phase-12b: tests for StockTransferService — 13 cases"
```

---

## Task 12: Full Regression Run and Docs Update

**Files:**
- Modify: `apps/backend/CLAUDE.md` (→ `/home/abdelkarimch/pos-project/CLAUDE.md`)
- Modify: `docs/IMPLEMENTATION_LOG.md`

- [ ] **Step 1: Run the complete test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend
```

Expected: all previous 497 tests + ~25 new tests pass. Note the new total.

- [ ] **Step 2: Update CLAUDE.md summary line**

In the `## Implementation status` section of `CLAUDE.md`, update:

```
**Current state: 497 tests passing, 37 suites, zero regressions.**
```

to reflect the new count (e.g. `~522 tests passing, 39 suites`).

Also update:
```
Completed phases: 0, 5, 6, 7, 8, 9, 10, Reports, 11A, 12A.
Next: 12B (Transfer Documents & Adjustment Approvals).
```
to:
```
Completed phases: 0, 5, 6, 7, 8, 9, 10, Reports, 11A, 12A, 12B.
Next: 12C (Vendor Payments).
```

And update the architectural facts:
```
- `StockBatchService.adjustBatch()` and `transferBatch()` contain the shared logic
  that Phase 12B must extract into reusable private methods
```
becomes:
```
- `StockBatchService.applyBatchAdjustmentInQr()` and `executeBatchTransferInQr()` are
  the shared methods called by StockAdjustmentService (post) and StockTransferService (post)
- When `stock_adjustment_approval` feature flag is enabled, INV-042 returns 422;
  use POST /api/business/stock-adjustments instead
```

- [ ] **Step 3: Add Phase 12B section to IMPLEMENTATION_LOG.md**

Append after the Phase 12A section:

```markdown
### Phase 12B — Transfer Documents & Adjustment Approvals (DONE). ~522 tests passing.

See extension spec §12 (EXT-INV-010–025) for requirement IDs.
See `docs/POS_Master_Spec_Consolidated.md` §B.2 and §B.3 for full spec.

**Migration + Entities:**
- [x] Migration `1714011000000-AddStockTransfersAndAdjustments` — 4 tables:
      stock_adjustments, stock_adjustment_items, stock_transfers, stock_transfer_items;
      feature flag `stock_adjustment_approval` inserted for all business types (disabled by default)
- [x] 4 new entities: StockAdjustment, StockAdjustmentItem, StockTransfer, StockTransferItem

**Shared Methods (StockBatchService):**
- [x] `applyBatchAdjustmentInQr(qr, batchId, businessId, delta, userId, notes, referenceType?, referenceId?)` — applies a delta inside a caller's QueryRunner with a stock_movement row; used by `postAdjustment`
- [x] `executeBatchTransferInQr(qr, sourceBatchId, businessId, targetWarehouseId, quantity, userId, notes?, referenceType?, referenceId?)` — executes a single-batch transfer (decrement source, new target batch, two movements) inside a caller's QueryRunner; used by `postTransfer`
- [x] Feature-flag gate added to `adjustBatch()`: returns `422 ADJUSTMENT_APPROVAL_REQUIRED` when `stock_adjustment_approval` is enabled for the business's type

**Stock Adjustment Workflow (EXT-INV-010–016):**
- [x] `StockAdjustmentService` + `StockAdjustmentController` — 7 endpoints under `/api/business/stock-adjustments`
- [x] Status flow: draft → pending_approval (submit) → approved (approve) → posted (post, applies deltas); or pending_approval → rejected (reject)
- [x] Auto-number: `ADJ-YYYY-NNNNN`
- [x] `can_propose_stock_adjustment` permission required to create; `can_approve_stock_adjustment` required to approve/reject
- [x] `postAdjustment` applies all item deltas atomically via `applyBatchAdjustmentInQr`; movements carry `reference_type='stock_adjustment'`, `reference_id=adjustment.id`

**Stock Transfer Documents (EXT-INV-020–025):**
- [x] `StockTransferService` + `StockTransferController` — 6 endpoints under `/api/business/stock-transfers`
- [x] Status flow: draft → posted (post, immutable) or draft → cancelled; hard-delete allowed only on draft
- [x] Auto-number: `TRF-YYYY-NNNNN`
- [x] `createTransfer` validates source ≠ target warehouse and all batches belong to source warehouse
- [x] `postTransfer` atomically calls `executeBatchTransferInQr` per item; movements carry `reference_type='stock_transfer'`, `reference_id=transfer.id`
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/IMPLEMENTATION_LOG.md
git commit -m "phase-12b: update docs — CLAUDE.md test count, IMPLEMENTATION_LOG.md Phase 12B section"
```

---

## Self-Review Against Spec

### Spec Coverage Check

| Spec Ref | Deliverable | Task |
|---|---|---|
| EXT-INV-010 | List adjustments | Task 5 + 6 |
| EXT-INV-011 | Adjustment detail | Task 5 + 6 |
| EXT-INV-012 | Create draft adjustment + `can_propose` | Task 5 + 6 |
| EXT-INV-013 | Submit (draft → pending_approval) | Task 5 + 6 |
| EXT-INV-014 | Approve (pending → approved) + `can_approve` | Task 5 + 6 |
| EXT-INV-015 | Post (approved → posted, atomic deltas) | Task 5 + 6 |
| EXT-INV-015 note | INV-042 returns 422 when flag enabled | Task 4 |
| EXT-INV-016 | Reject + reason | Task 5 + 6 |
| B.2.1 | Feature flag `stock_adjustment_approval` disabled by default | Task 1 |
| B.2.6 | Permission keys `can_propose_stock_adjustment`, `can_approve_stock_adjustment` | Task 6 |
| EXT-INV-020 | List transfers | Task 7 + 8 |
| EXT-INV-021 | Transfer detail | Task 7 + 8 |
| EXT-INV-022 | Create draft transfer, validate source≠target, batches in source WH | Task 7 + 8 |
| EXT-INV-023 | Post transfer atomically, immutable after | Task 7 + 8 |
| EXT-INV-024 | Cancel (draft only) | Task 7 + 8 |
| EXT-INV-025 | Delete draft, hard delete | Task 7 + 8 |
| B.3.4 | INV-044 ad-hoc transfers unaffected | Task 4 (no change to transferBatch) |
| B.3.4 | Posted transfers use `reference_type='stock_transfer'` in movements | Task 7 |

All 17 spec items covered. ✓

### Placeholder Scan

No TBDs, TODOs, or "similar to task N" patterns. All code blocks are complete. ✓

### Type Consistency

- `StockAdjustmentItem.proposed_delta` is `numeric(12,3)` in migration ↔ `NUMERIC(12,3)` entity ↔ `proposed_delta: number` in DTO ✓
- `applyBatchAdjustmentInQr` signature used in Task 4 matches calls in Task 5 ✓
- `executeBatchTransferInQr` signature used in Task 4 matches calls in Task 7 ✓
- `StockBatchService` injected into both new services; both new services added to `InventoryModule` providers ✓
